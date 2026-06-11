# Rezumat Proiect - Sistem Pontaj Secție ATI (Spital Pașcani)

Acest document conține istoricul discuțiilor, modificările implementate și starea curentă a proiectului. Este destinat transferului de context către un alt chat / asistent AI.

---

## 1. Context și Obiective
Aplicația este un planificator de ture și pontaj digital pentru secția ATI a Spitalului Municipal Pașcani. Ghidează organizarea turelor pentru medici (MED) și asistenți (AS) cu norme diferite și reguli specifice din Codul Muncii din România.

---

## 2. Modificări Implementate (Istoric și Funcționalități)

### A. Calculul Dinamic al Orelor de Contract și Norme
* Tranzitarea de la ore de contract statice la un calcul dinamic bazat pe numărul de zile lucrătoare (L-V) din luna respectivă și procentul normei angajatului (`1.0` pentru 100%, `0.75`, `0.5` etc.):
  $$\text{Target Ore Contract} = \text{Zile Lucrătoare (Mon-Fri)} \times 8 \times \text{Normă}$$
* Migrarea automată a datelor vechi din `localStorage` la noile norme.

### B. Zile Libere Legale (Sărbători de Stat)
* Integrarea tuturor sărbătorilor legale din România (inclusiv cele mobile precum Paștele Ortodox, Vinerea Mare și Rusaliile calculate astronomic prin algoritmul Meeus Julian).
* **Scăderea orelor de contract**: Orice sărbătoare legală care pică în cursul săptămânii scade cu 8 ore (pentru normă 1.0) targetul lunar de ore de contract.
* **Turele pe timp de sărbătoare**: În spital se lucrează în aceste zile. Orice tură efectuată de sărbătoare legală (indiferent dacă e în cursul săptămânii sau în weekend) este calculată automat sub **Ore suplimentare 100%** (conform legislației din România).
* **Prevenirea ștergerii turelor de sărbătoare**: Generatorul automat nu va șterge turele de 8 ore programate în zilele de sărbătoare legală, forțând compensarea în alte zile lucrătoare.
* Zilele de sărbătoare legală sunt evidențiate în tabel cu o culoare roz deschis (`#ffe4e6`) și au un tooltip ("Sărbătoare Legală").

### C. Optimizarea Generatorului Automat (Algoritmul de Ture)
* **Rotația Strică Zi/Noapte (Z N - -)**: Pentru personalul pe ture normale, algoritmul asigură respectarea ciclului `Zi (Z) -> Noapte (N) -> Repaus (L) -> Repaus (L)`.
  * Cel care a lucrat tura `Z` este prioritar pentru tura `N` din ziua următoare.
  * După tura `N`, angajatul are repaus garantat 2 zile.
* **Ture în Weekend pentru Angajații de 8h**: Angajații cu program de 8h pot fi planificați și în weekend. Algoritmul îi programează pe toate zilele lunii pentru a acoperi necesarul, apoi elimină din turele excedentare (din zilele normale sau weekenduri) pentru a ajunge la numărul exact de ture necesare normei lor, acordându-le zile libere compensatorii (`-`).

### D. Planificator Concedii (CO / CIC) și Blocaje Securitate
* Adăugarea unui panou pentru selectarea unui interval de concediu (de la Ziua X la Ziua Y) pentru `CO` (Concediu de Odihnă) sau `CIC` (Concediu Îngrijire Copil).
* **Lock de siguranță**: Celulele cu `CO` sau `CIC` nu permit modificarea accidentală cu ture de tip `Z`, `N` sau `8` în meniul dropdown. Utilizatorul trebuie să seteze celula înapoi pe `-` pentru a o debloca.

### E. Design Premium, Interfață Responsivă și Modal Centrat
* **Modal Centrat (Glassmorphism)**: Panoul "Personal & Setări" a fost transformat dintr-un sidebar într-un modal premium centrat pe ecran, cu fundal blurat (glassmorphic backdrop blur) care estompează restul pontajului.
* **Layout pe 2 coloane (Desktop)**: În modal, pe ecrane mari, gestiunea personalului și planificarea concediilor sunt în stânga, iar necesarul zilnic de ture este în dreapta. Pe mobil, se transformă într-o singură coloană.
* **Mărirea butoanelor și distanțelor**: Dropdown-urile inline (insignele de normă, rol, tip rotație) sunt mai mari, mai spațiate (`gap: 0.75rem`), iar lățimea minimă a fost crescută pentru a elimina trunchierea textului.

### F. Remedierea Deployment-ului pe GitHub Pages
* Corectarea workflow-ului `.github/workflows/deploy.yml` pentru a folosi acțiunile oficiale de deployment (`actions/upload-pages-artifact` și `actions/deploy-pages`) în loc de push pe branch-ul `gh-pages`.
* Adăugarea configurării de concurență `cancel-in-progress: true` pentru a preveni erorile de tip "deployment in progress" când se fac push-uri succesive.

---

## 3. Fișiere Cheie din Proiect

* **[`src/utils/calculations.ts`](file:///Users/sergiu/Desktop/spital/src/utils/calculations.ts)**:
  * `getRomanianLegalHolidays(year)`: returnează toate sărbătorile legale (fixe și mobile).
  * `getWorkingDaysCount(year, month)`: calculează numărul de zile lucrătoare (Mon-Fri) excluzând sărbătorile legale de pe parcursul săptămânii.
  * `calculateEmployeeHours(employee, shifts, year, month)`: calculează orele lucrate, orele de noapte, orele suplimentare 50% și 100% (incluzând weekend-urile și sărbătorile legale) și orele nelucrate.
* **[`src/utils/scheduler.ts`](file:///Users/sergiu/Desktop/spital/src/utils/scheduler.ts)**:
  * Algoritmul de generare automată cu rotația `Z N - -`, gestionarea concediilor și planificarea celor de 8h cu excluderea sărbătorilor de la eliminare.
* **[`src/components/ScheduleTable.tsx`](file:///Users/sergiu/Desktop/spital/src/components/ScheduleTable.tsx)**:
  * Structura tabelului principal, taburile de filtrare (Toți / Tura Normală / Doar 8h) și randarea celulelor cu stilul pentru sărbători legale.
* **[`src/components/StaffManager.tsx`](file:///Users/sergiu/Desktop/spital/src/components/StaffManager.tsx)**:
  * Administrarea listei de personal din modal.
* **[`src/App.tsx`](file:///Users/sergiu/Desktop/spital/src/App.tsx)**:
  * State-ul global al aplicației, încărcarea/salvarea datelor din local storage și modalul de setări.
* **[`src/index.css`](file:///Users/sergiu/Desktop/spital/src/index.css)**:
  * Toate stilurile CSS, design-ul modalului, evidențierea sărbătorilor legale, design-ul responsive.
* **[`.github/workflows/deploy.yml`](file:///Users/sergiu/Desktop/spital/.github/workflows/deploy.yml)**:
  * Workflow-ul automat de build și deployment pe GitHub Pages.

---

## 4. Instrucțiuni pentru următorul Agent AI

Când inițiezi un chat nou în noul director:
1. Citește fișierele din `src/utils/` și `src/components/` pentru a înțelege exact cum sunt legate datele.
2. În caz de modificări la interfață, asigură-te că păstrezi design-ul premium (glassmorphic blur, butoane rotunjite, culori HSL moderne, responsivitate).
3. Păstrează calculul orelor exact conform regulilor din `calculations.ts`, mai ales prioritizarea orelor suplimentare de 100% (weekend + sărbători legale) în fața celor de 50%.
4. Pentru orice deployment suplimentar, se folosește direct push-ul pe `main`/`master`, iar GitHub Actions se va ocupa de build.
