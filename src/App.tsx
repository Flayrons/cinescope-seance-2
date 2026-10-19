import { useEffect, useMemo, useRef, useState } from "react";
import posterAube from "./assets/aube.svg";
import posterMemoire from "./assets/memoire.svg";
import posterOrbite from "./assets/orbite.svg";

const films = [
  { id: 1, title: "Après l’aube", genre: "Drame", time: "18 h 10", available: true, poster: posterAube },
  { id: 2, title: "La mémoire des murs", genre: "Documentaire", time: "19 h 30", available: false, poster: posterMemoire },
  { id: 3, title: "Orbite 9", genre: "Science-fiction", time: "21 h 00", available: true, poster: posterOrbite },
];

type Film = (typeof films)[number];

export default function App() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const selectedFilm = films.find((film) => film.title === selected);
  const [favorites, setFavorites] = useState<number[]>([]);
  const filteredFilms = useMemo(
    () => films.filter((film) => film.title.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const toggleFavorite = (id: number) => {
    setFavorites((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };

  // Un déclencheur par film, indexé par identifiant : à la fermeture on rend
  // le focus au bouton réellement activé, et non au premier de la grille.
  const triggerRefs = useRef(new Map<number, HTMLButtonElement>());
  const triggerToRestore = useRef<number | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  const openBooking = (film: Film) => {
    triggerToRestore.current = film.id;
    setSelected(film.title);
  };

  // L'état React est la seule source de vérité : toutes les voies de
  // fermeture (Escape, croix, « Revenir aux films ») repassent par ici.
  const closeBooking = () => setSelected(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog) {
      // Le `<dialog>` n'est modal que s'il est ouvert via `showModal()` : c'est
      // cet appel qui expose le rôle `dialog`, rend l'arrière-plan inerte et
      // câble la touche Escape.
      if (!dialog.open) dialog.showModal();
      // On place le focus sur le conteneur nommé plutôt que sur le premier
      // bouton : le dialogue et son titre sont annoncés avant les commandes.
      dialog.focus();
      return;
    }
    // Le dialogue vient d'être démonté : l'arrière-plan n'est plus inerte, on
    // peut enfin rendre le focus au déclencheur mémorisé à l'ouverture.
    const filmId = triggerToRestore.current;
    if (filmId === null) return;
    triggerToRestore.current = null;
    triggerRefs.current.get(filmId)?.focus();
  }, [selectedFilm]);

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#programme" onClick={() => setQuery("")}>CinéScope</a>
        <nav aria-label="Navigation principale">
          <ul className="menu">
            <li><a href="#programme">Programme</a></li>
            <li><a href="#infos">Informations</a></li>
          </ul>
        </nav>
      </header>
      <main className="page">
        <h1>Films à l’affiche</h1>
        <p className="intro">Découvrez la programmation de cette semaine.</p>
        <div className="search-field">
          <label htmlFor="film-search">Rechercher un film</label>
          <input id="film-search" className="search" type="search" value={query}
            onChange={(event) => setQuery(event.target.value)} />
        </div>
        <section id="programme" aria-labelledby="programme-title">
          <h2 id="programme-title">Programme</h2>
          <div className="film-grid">
            {filteredFilms.map((film) => {
              const isFavorite = favorites.includes(film.id);
              return (
                <article className="film-card" key={film.id}>
                  <img src={film.poster} alt="" />
                  <div className="film-content">
                    <p className={"availability " + (film.available ? "available" : "unavailable")}>
                      {film.available ? "Places disponibles" : "Séance complète"}
                    </p>
                    <h3>{film.title}</h3>
                    <p>{film.genre} · {film.time}</p>
                    <div className="actions">
                      <button type="button" className="booking-trigger"
                        ref={(node) => {
                          if (node) triggerRefs.current.set(film.id, node);
                          else triggerRefs.current.delete(film.id);
                        }}
                        onClick={() => openBooking(film)}>
                        Réserver {film.title}
                      </button>
                      <button type="button" className="favorite" aria-pressed={isFavorite}
                        aria-label={"Favori : " + film.title} onClick={() => toggleFavorite(film.id)}>
                        <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {filteredFilms.length === 0 && <p>Aucun film ne correspond à votre recherche.</p>}
        </section>
        <section id="infos" className="infos" aria-labelledby="infos-title">
          <h2 id="infos-title">Informations pratiques</h2>
          <p>Le cinéma ouvre trente minutes avant la première séance.</p>
        </section>
        {selectedFilm && (
          <dialog className="modal" ref={dialogRef} tabIndex={-1}
            aria-labelledby="booking-dialog-title"
            onCancel={(event) => {
              // Escape : on empêche la fermeture native pour que l'état React
              // reste la seule source de vérité et pilote le démontage.
              event.preventDefault();
              closeBooking();
            }}>
            <div className="dialog-heading">
              <h2 id="booking-dialog-title">Réserver {selectedFilm.title}</h2>
              <button type="button" className="close"
                aria-label={"Fermer la réservation : " + selectedFilm.title}
                onClick={closeBooking}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <p>{selectedFilm.genre} · Séance de {selectedFilm.time}</p>
            <p className={"availability " + (selectedFilm.available ? "available" : "unavailable")}>
              {selectedFilm.available ? "Places disponibles" : "Séance complète"}
            </p>
            <p>Consultez la séance et sa disponibilité avant de revenir au programme.</p>
            <button className="dialog-action" type="button" onClick={closeBooking}>Revenir aux films</button>
          </dialog>
        )}
      </main>
    </>
  );
}
