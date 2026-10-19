# Note de TP — Réparer la fenêtre modale

Les acquis de la séance 1 (affiches, recherche, favoris, informations
pratiques) sont conservés, ainsi que la présentation. Un correctif par commit.

## Trois problèmes rencontrés

### 1. Le déclencheur « Réserver » n'était pas un élément interactif

`<div class="booking-trigger fake-button" onClick={…}>` : pas de rôle, pas
d'entrée dans l'ordre de tabulation, pas d'activation à `Entrée` / `Espace`.

**Impact utilisateur.** Blocage complet, dès la première étape du scénario.
Une personne qui navigue au clavier ou avec un lecteur d'écran ne peut pas
réserver : le bouton n'existe simplement pas pour elle. Le reste de la
fenêtre, même parfait, serait inatteignable.

**Vérification.** `Tab` depuis le champ de recherche atteint désormais les
trois boutons « Réserver » ; `Entrée` et `Espace` ouvrent tous deux la
fenêtre. Panneau Accessibilité des DevTools sur le déclencheur : rôle
`button`, nom calculé « Réserver Après l'aube ».

### 2. La fenêtre n'était ni un dialogue, ni nommée, et ne retenait pas le focus

Un empilement `div.backdrop` / `div.modal` : aucun rôle exposé, nom calculé
vide, et toute la page derrière restait dans l'ordre de tabulation.

**Impact utilisateur.** Rien ne signale l'ouverture d'une fenêtre. L'étape 3
du scénario (« identifier le nom de la fenêtre ») est impossible : on ne sait
pas de quel film on parle, et deux réservations différentes sont
indiscernables. Surtout, le premier `Tab` sort de la fenêtre et part explorer
un arrière-plan masqué par un voile opaque : l'utilisateur agit à l'aveugle
sur des commandes qu'il ne voit pas.

**Vérification.** Passage à `<dialog>` ouvert par `showModal()` et nommé par
`aria-labelledby` pointant vers son `<h2>` visible. Dans le navigateur :
`dialog.matches(':modal')` renvoie `true` ; le panneau Accessibilité affiche
rôle `dialog` et nom « Réserver Orbite 9 » ; `Tab` ne sort plus de la fenêtre,
et un `focus()` forcé sur le champ de recherche de l'arrière-plan est ignoré
— preuve que l'inertie du *top layer* est bien active.

### 3. Le cycle du focus était rompu aux deux extrémités

À l'ouverture, le focus restait sur la page derrière. À la fermeture, il
retombait sur `<body>`. La croix « × » était un `<span onClick>`, donc ni
focusable ni nommée : ni `Escape` ni le bouton de fermeture n'étaient
utilisables au clavier.

**Impact utilisateur.** Fenêtre sans issue au clavier, puis perte de repère :
après fermeture, le `Tab` suivant repart du tout début de la page. Qui
consultait le troisième film doit retraverser l'en-tête, la navigation, la
recherche et deux cartes pour revenir où il était. C'est le piège de
l'atelier 4 : une correction naïve (« focus le premier bouton Réserver »)
ramène en plus au mauvais film.

**Vérification.** Scénario des sept étapes rejoué dans le navigateur, sur
« Après l'aube » puis « Orbite 9 », en relevant `document.activeElement`
avant, pendant et après : le `<dialog>` à l'ouverture, puis le bouton
« Réserver <film demandé> » après chacune des trois sorties (`Escape`, croix,
« Annuler »), avec contour de focus visible.

## Le piège le plus coûteux : l'événement `close`

Les six points du socle « passaient » en lecture de code, mais le scénario
rejoué dans le navigateur a révélé une régression invisible autrement : après
une première fermeture, le déclencheur ne rouvrait plus rien.

La fermeture reposait sur `dialog.close()` et le handler `onClose` pour
remettre l'état React à `null`. Or l'événement `close` n'est pas émis par
tous les moteurs — il ne l'est pas dans le navigateur de vérification
(Chromium 148 embarqué), ce qu'un `MutationObserver` et un écouteur `close`
posés à la main ont confirmé, alors que `cancel` est bien émis. L'élément
passait donc à `open = false` tandis que `selected` valait encore le titre du
film : réappuyer sur le déclencheur ne changeait pas l'état, donc ne
provoquait aucun rendu, donc n'appelait jamais `showModal()`.

Le diagnostic a failli être manqué : le focus *semblait* revenir au bon
bouton. C'est le navigateur qui le restaure nativement à la fermeture d'un
dialogue, pas notre code — un faux positif qui validait une correction
pourtant inopérante.

Correction : l'état React devient la seule source de vérité. `onCancel` avec
`preventDefault()` intercepte `Escape` sans laisser le dialogue se fermer
tout seul, et c'est le démontage du composant qui le retire du *top layer*.
Le retour du focus migre dans l'effet, sur la branche « dialogue démonté » —
nécessaire et pas cosmétique : tant que la fenêtre est ouverte, l'arrière-plan
est inerte et un `focus()` sur le déclencheur y est purement ignoré.

## Travail demandé — état

| Point | Correction |
| --- | --- |
| Élément natif pour le déclencheur | `<button type="button">` |
| Rôle et nom accessibles | `<dialog>` + `showModal()` + `aria-labelledby` → `<h2>` |
| Entrée du focus à l'ouverture | `tabIndex={-1}` sur le conteneur puis `dialog.focus()` |
| Fermeture au clavier, bouton nommé | `onCancel` pour `Escape`, croix en `<button>` + `aria-label` |
| Retour du focus au déclencheur | `Map` de refs indexée par `film.id`, restaurée après démontage |
| Arrière-plan hors parcours | assuré par `showModal()` (*top layer*) |

Le focus entre sur le conteneur nommé plutôt que sur la première commande :
le nom du dialogue est annoncé avant les boutons. Sinon on atterrit sur
« Fermer » sans savoir où l'on est, et l'`Escape` réflexe donne l'impression
que rien ne s'est passé.

## Contraintes

- **Aucun `tabIndex` positif** : seule valeur présente, `-1` sur le
  `<dialog>`. Vérifié par balayage du DOM — aucun `[tabindex]` positif.
- **Éléments natifs privilégiés** : `<dialog>`, `<button>`. Aucun
  `role="dialog"`, `aria-modal` ni gestionnaire `keydown` écrits à la main ;
  le navigateur fournit le rôle, la modalité et `Escape`.
- **Indicateur de focus conservé** : la règle
  `:focus-visible { outline: 3px solid #ffbf47; outline-offset: 3px }` est
  intacte et rien ne la neutralise. L'entrée du focus étant programmatique,
  aucun contour n'apparaît inutilement pour les utilisateurs de souris.
- **Compréhensible à 200 % de zoom** : mesuré à 400 px de large (équivalent
  200 % sur une fenêtre de 800 px). Aucun débordement horizontal de la page
  ni du dialogue, les deux actions s'empilent grâce à `flex-wrap`, chaque
  cible conserve 44 px de haut, et l'ordre DOM suit l'ordre visuel
  (atelier 2).

## Bonus

**`BookingDialog` typé** (`src/BookingDialog.tsx`) — contrat
`{ film: Film; onClose: () => void; onConfirm: (film: Film) => void }`, le
type `Film` et les données dans `src/films.ts`. L'identifiant du titre vient
de `useId()` : le nom accessible reste adossé au `<h2>` visible, sans risque
de collision d'`id` — un `aria-labelledby` pointant vers un `id` dupliqué
retomberait silencieusement sur le mauvais film. Le cycle du focus reste
réparti au bon endroit : l'entrée appartient au dialogue, le retour à `App`,
seul à connaître les boutons de la grille. `key={selectedFilm.id}` garantit un
montage neuf par film.

**Confirmation explicite** — les commandes dépendent de la disponibilité :
« Confirmer la réservation » + « Annuler » pour une séance disponible,
seulement « Revenir aux films » pour une séance complète (un bouton de
confirmation inopérant serait plus trompeur qu'utile). `onConfirm` est une
prop distincte d'`onClose` : la distinction est structurelle, pas seulement
affichée. Les noms accessibles commencent par le libellé visible puis le
complètent avec le film et l'horaire (« Confirmer la réservation : Orbite 9,
séance de 21 h 00 »), ce qu'exige WCAG 2.5.3 « Étiquette dans le nom » pour
le pilotage vocal.

**Région `role="status"`** — le résultat est publié dans une live region
polie, annoncée sans interrompre la lecture et **sans déplacer le focus** :
l'y déplacer aurait concurrencé le retour au déclencheur et fait perdre la
position dans la grille. Deux subtilités sans lesquelles la région ne
fonctionne pas :

1. la région est rendue dès le premier affichage, **vide**. Une live region
   insérée en même temps que son contenu n'est pas annoncée : les
   technologies d'assistance ne surveillent que les régions déjà connues au
   moment de la mutation ;
2. un `key` incrémental sur le paragraphe force React à remplacer le nœud même
   quand le texte est identique. Sans lui, confirmer deux fois de suite la
   même séance ne modifie aucun nœud de texte, donc ne déclenche aucune
   annonce.

### Cas limites vérifiés

| Cas | Attendu | Observé |
| --- | --- | --- |
| Séance complète (« La mémoire des murs ») | aucune confirmation proposée | seul « Revenir aux films » |
| Annulation par `Escape` | aucune réservation, focus au déclencheur | région inchangée, focus correct |
| Annulation par la croix | idem | idem |
| Annulation par « Annuler » | idem | idem |
| Deux confirmations du même film | deux annonces distinctes | retrait puis insertion du nœud observés au `MutationObserver` |
| Réouverture après fermeture | fenêtre réouvrable | corrigée (voir § `close`) |
| Deux films successifs | retour au déclencheur demandé | focus sur le bon bouton à chaque fois |

## Méthode de vérification

1. **Clavier seul**, sans souris : les sept étapes du scénario, rejouées sur
   deux films puis sur la séance complète.
2. **Panneau Accessibilité des DevTools** : rôle et nom calculés du
   déclencheur, du dialogue et des trois boutons.
3. **Relevés de `document.activeElement`** avant, pendant et après chaque
   fermeture — c'est ce qui a permis de distinguer le retour de focus assuré
   par notre code de celui, trompeur, assuré par le navigateur.
4. **`MutationObserver` posé sur la région `role="status"`**, pour observer ce
   que verrait une technologie d'assistance plutôt que de supposer l'annonce.
5. **`tsc --noEmit`** sur chaque commit.
6. **Mesures de mise en page à 400 px** pour la contrainte de zoom.

Reste à valider avec l'enseignant au lecteur d'écran : l'annonce effective de
la région `role="status"` et l'ordre de lecture à l'ouverture du dialogue.
Les manipulations ont toutes été reportées dans les sources React ; aucune
correction n'est restée dans l'inspecteur.

Le scénario reste une simulation : aucun billet réel n'est émis.
