<div align="center">

  <h1>Grafic Ture & Concedii Spital</h1>
  
  <p>
    O aplicație modernă, performantă și ușor de utilizat, destinată planificării automate a turelor și a concediilor personalului medical. 
  </p>

<!-- Badges -->
<p>
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="vite" />
  <img src="https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9" alt="electron" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="react" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="tailwindcss" />
</p>
</div>

<br />

<!-- Table of Contents -->
# :notebook_with_decorative_cover: Cuprins

- [Despre Proiect](#star2-despre-proiect)
  * [Tech Stack](#space_invader-tech-stack)
  * [Funcționalități Cheie](#dart-funcționalități-cheie)
- [Cum să începi](#toolbox-cum-să-începi)
  * [Cerințe preliminare](#bangbang-cerințe-preliminare)
  * [Instalare & Rulare Locală](#gear-instalare--rulare-locală)
  * [Build Aplicație Executabilă (Desktop)](#triangular_flag_on_post-build)
- [Utilizare](#eyes-utilizare)
- [Licență](#warning-licență)

<!-- About the Project -->
## :star2: Despre Proiect

Proiectul a fost dezvoltat cu scopul de a ușura și digitaliza munca asistentelor șefe/managementului medical, eliminând necesitatea calculării manuale a orelor sau a turelor. Interfața intuitivă și vizuală oferă feedback imediat dacă un angajat și-a îndeplinit normativul de ore, și poate genera luna întreagă la un singur click.

<!-- TechStack -->
### :space_invader: Tech Stack

<details>
  <summary>Frontend & Tooling</summary>
  <ul>
    <li><a href="https://www.typescriptlang.org/">TypeScript</a></li>
    <li><a href="https://reactjs.org/">React.js</a></li>
    <li><a href="https://vitejs.dev/">Vite</a></li>
    <li><a href="https://tailwindcss.com/">TailwindCSS</a></li>
    <li><a href="https://lucide.dev/">Lucide React</a> (pentru iconițe)</li>
    <li><a href="https://artskydj.github.io/jsPDF/docs/jsPDF.html">jsPDF & jsPDF-AutoTable</a> (pentru generarea tabelelor PDF)</li>
  </ul>
</details>

<details>
  <summary>Desktop Wrapper</summary>
  <ul>
    <li><a href="https://www.electronjs.org/">Electron</a></li>
    <li><a href="https://www.electron.build/">Electron Builder</a></li>
  </ul>
</details>

<!-- Features -->
### :dart: Funcționalități Cheie

- **Algoritm de Auto-Generare Ture**: Creează ture aleatorii pentru angajați astfel încât să își completeze norma exactă de ore (pentru cei cu ture de 12h, 8h, ș.a.), evitând tiparele repetitive și distribuind concediile corect.
- **Evitare Suprascrieri**: Turele blocate (sau șterse voit prin marcarea cu "-") nu vor fi alterate sau realocate de către auto-generatorul algoritmic.
- **Export PDF Nativ**: Descărcarea tabelelor în format A4 (Portret pentru Ture, Landscape pentru Concedii Anuale), conținând elemente de grafică, evidențiere prin culori (legende) și **suport perfect pentru diacritice românești**.
- **Calcul Ora/Normă Live**: Evidențiază direct în interfață dacă orele sunt pe minus (cu roșu), atinse cu succes (cu verde) sau depășite.
- **Salvare / Încărcare Locală**: Toate setările și planificările pot fi exportate și importate înapoi pe desktop sub formă de fișier `.json`.
- **Aplicație Nativă**: Poate fi ambalată `.exe` / `.dmg` rulând direct pe desktop.

<!-- Getting Started -->
## 	:toolbox: Cum să începi

<!-- Prerequisites -->
### :bangbang: Cerințe preliminare

Ai nevoie de [Node.js](https://nodejs.org/) și de `npm` (sau `yarn`).

<!-- Installation -->
### :gear: Instalare & Rulare Locală

1. Clonează repo-ul:
```bash
git clone https://github.com/your-username/grafice.git
```

2. Navighează în folderul proiectului:
```bash
cd grafice
```

3. Instalează dependențele:
```bash
npm install
```

4. Rulează serverul de dezvoltare. Această comandă va compila aplicația cu Vite și va deschide automat o fereastră de Electron:
```bash
npm run dev
```

<!-- Deployment -->
### :triangular_flag_on_post: Build (Aplicație Desktop)

Dacă dorești să împachetezi aplicația într-un executabil (`.exe` pentru Windows sau `.dmg` / `.app` pentru MacOS), rulează:

```bash
npm run build
```

Fișierele executabile finale vor fi generate în folderul `release/`.

<!-- Usage -->
## :eyes: Utilizare

1. Deschide aplicația și accesează sidebar-ul din stânga.
2. Adaugă noii angajați (Setează-le Funcția, tipul de tură și norma/orele dorite).
3. Du-te pe "Grafic Ture" pentru luna dorită și apasă **Generează Automat**.
4. Ajustează manual ture unde este nevoie (printr-un simplu clic pe ziua respectivă).
5. Treci la secțiunea **Concedii** pentru a gestiona numărul total de zile alocate și pentru a distribui vizual zilele de odihnă ale echipei.
6. Apasă butonul de descărcare (`PDF`) la final pentru a lista documentele la imprimantă!

<!-- License -->
## :warning: Licență

Acest proiect a fost generat pentru uz intern. Dacă va fi deschis pe viitor, se va aplica o licență corespunzătoare.
