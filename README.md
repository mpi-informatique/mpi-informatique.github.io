# MPI Informatique

Accueil : https://mpi-informatique.github.io/.

Terminal statique, sans dépendance : `index.html`, `style.css`, `terminal.js` et `favicon.svg`. Publication sur GitHub Pages depuis `main`.

La première commande, `tree`, affiche l'arborescence dans un panneau permanent, conservé même après `clear`. L'historique des commandes défile séparément. Le terminal occupe 80 % de la largeur sur ordinateur.

`ls` affiche le dossier courant. `tree` affiche une arborescence cliquable. `cd` parcourt les dossiers et ouvre les sites, avec complétion des chemins par Tab et sélection par les flèches. `cd ..` remonte d'un niveau, `cd /` revient à la racine et `pwd` affiche le chemin courant. Les boutons précédent/suivant du navigateur retrouvent les dossiers visités.

```text
~/sites
├── cours/
│   ├── mpi
│   └── mp2i
├── exercices/
│   ├── automates
│   └── deduction-naturelle
└── programmation/
    ├── ocaml
    ├── c
    ├── sql
    └── tp
```

Les destinations sont définies par les liens `data-path` d'`index.html`, qui restent utilisables sans JavaScript. Les dossiers sont construits à partir de ces liens. `programmation/tp` ouvre le dépôt et son mode d'emploi. `cours/mp2i` ouvre le site existant, sans migration.

`help` et `clear` complètent les commandes humoristiques `man`, `rm`, `cp` et `mv`.
