require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// GET all employees
app.get('/api/employees', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT CAST(id AS TEXT) as id, name, role, contract_hours as "contractHours", active FROM employees ORDER BY role DESC, name ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST add employee
app.post('/api/employees', async (req, res) => {
  const { name, role, contractHours } = req.body;
  if (!name || !role || !contractHours) {
    return res.status(400).json({ error: 'Name, role, and contractHours are required' });
  }
  try {
    const { rows } = await db.query(
      'INSERT INTO employees (name, role, contract_hours) VALUES (?, ?, ?) RETURNING CAST(id AS TEXT) as id, name, role, contract_hours as "contractHours", active',
      [name, role, contractHours]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE employee
app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM employees WHERE id = ?', [parseInt(id)]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET shifts for a specific month
app.get('/api/shifts', async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }
  try {
    const { rows } = await db.query(
      'SELECT CAST(employee_id AS TEXT) as employee_id, day, shift_type FROM shifts WHERE year = ? AND month = ?',
      [parseInt(year), parseInt(month)]
    );
    
    // Format response: { employeeId: { day: shiftType } }
    const result = {};
    rows.forEach((row) => {
      const empId = row.employee_id;
      if (!result[empId]) {
        result[empId] = {};
      }
      result[empId][row.day] = row.shift_type;
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST save shifts for a month (Transactional bulk-save)
app.post('/api/shifts', async (req, res) => {
  const { year, month, shifts } = req.body;
  if (!year || month === undefined || !shifts) {
    return res.status(400).json({ error: 'Year, month, and shifts are required' });
  }

  const dbConn = await db.getDb();
  try {
    await dbConn.run('BEGIN TRANSACTION');
    
    // 1. Delete existing shifts for this month
    await dbConn.run(
      'DELETE FROM shifts WHERE year = ? AND month = ?',
      [parseInt(year), parseInt(month)]
    );

    // 2. Insert new shifts
    for (const empId of Object.keys(shifts)) {
      const empShifts = shifts[empId];
      for (const day of Object.keys(empShifts)) {
        const type = empShifts[day];
        // Only insert shifts that aren't empty/free indicator
        if (type && type !== '-') {
          await dbConn.run(
            'INSERT INTO shifts (employee_id, year, month, day, shift_type) VALUES (?, ?, ?, ?, ?)',
            [parseInt(empId), parseInt(year), parseInt(month), parseInt(day), type]
          );
        }
      }
    }

    await dbConn.run('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await dbConn.run('ROLLBACK');
    console.error('Error saving shifts transaction:', error);
    res.status(500).json({ error: 'Failed to save shifts' });
  }
});

// GET coverage requirements
app.get('/api/requirements', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT role, day_shifts as "dayShifts", night_shifts as "nightShifts" FROM requirements');
    const result = {
      MED: { dayShifts: 1, nightShifts: 1 },
      AS: { dayShifts: 3, nightShifts: 3 }
    };
    rows.forEach(row => {
      result[row.role] = {
        dayShifts: row.dayShifts,
        nightShifts: row.nightShifts
      };
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST save requirements
app.post('/api/requirements', async (req, res) => {
  const { MED, AS } = req.body;
  if (!MED || !AS) {
    return res.status(400).json({ error: 'MED and AS requirements are required' });
  }
  try {
    await db.query(
      'INSERT INTO requirements (role, day_shifts, night_shifts) VALUES (?, ?, ?) ON CONFLICT (role) DO UPDATE SET day_shifts = EXCLUDED.day_shifts, night_shifts = EXCLUDED.night_shifts',
      ['MED', MED.dayShifts, MED.nightShifts]
    );
    await db.query(
      'INSERT INTO requirements (role, day_shifts, night_shifts) VALUES (?, ?, ?) ON CONFLICT (role) DO UPDATE SET day_shifts = EXCLUDED.day_shifts, night_shifts = EXCLUDED.night_shifts',
      ['AS', AS.dayShifts, AS.nightShifts]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving requirements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET vacation planning for a specific year
app.get('/api/vacations', async (req, res) => {
  const { year } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Year is required' });
  }
  try {
    const { rows } = await db.query(
      'SELECT CAST(employee_id AS TEXT) as employee_id, job_title, seniority_total, seniority_unit, vacation_days_allowed, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec FROM vacation_planning WHERE year = ?',
      [parseInt(year)]
    );
    
    // Format response: { employeeId: { jobTitle, seniorityTotal, seniorityUnit, vacationDaysAllowed, monthlyPlanned: { 0: jan, 1: feb, ... } } }
    const result = {};
    rows.forEach((row) => {
      result[row.employee_id] = {
        jobTitle: row.job_title || '',
        seniorityTotal: row.seniority_total || '',
        seniorityUnit: row.seniority_unit || '',
        vacationDaysAllowed: row.vacation_days_allowed || '',
        monthlyPlanned: {
          0: row.jan || '',
          1: row.feb || '',
          2: row.mar || '',
          3: row.apr || '',
          4: row.may || '',
          5: row.jun || '',
          6: row.jul || '',
          7: row.aug || '',
          8: row.sep || '',
          9: row.oct || '',
          10: row.nov || '',
          11: row.dec || ''
        }
      };
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching vacations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST save vacation planning for a year (Transactional bulk-save)
app.post('/api/vacations', async (req, res) => {
  const { year, vacations } = req.body;
  if (!year || !vacations) {
    return res.status(400).json({ error: 'Year and vacations data are required' });
  }

  const dbConn = await db.getDb();
  try {
    await dbConn.run('BEGIN TRANSACTION');
    
    // 1. Delete existing vacation planning for this year
    await dbConn.run(
      'DELETE FROM vacation_planning WHERE year = ?',
      [parseInt(year)]
    );

    // 2. Insert new vacation planning
    for (const empId of Object.keys(vacations)) {
      const v = vacations[empId];
      const m = v.monthlyPlanned || {};
      await dbConn.run(
        `INSERT INTO vacation_planning (
          employee_id, year, job_title, seniority_total, seniority_unit, vacation_days_allowed,
          jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parseInt(empId),
          parseInt(year),
          v.jobTitle || '',
          v.seniorityTotal || '',
          v.seniorityUnit || '',
          v.vacationDaysAllowed || '',
          m[0] || '',
          m[1] || '',
          m[2] || '',
          m[3] || '',
          m[4] || '',
          m[5] || '',
          m[6] || '',
          m[7] || '',
          m[8] || '',
          m[9] || '',
          m[10] || '',
          m[11] || ''
        ]
      );
    }

    await dbConn.run('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await dbConn.run('ROLLBACK');
    console.error('Error saving vacations transaction:', error);
    res.status(500).json({ error: 'Failed to save vacations' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
