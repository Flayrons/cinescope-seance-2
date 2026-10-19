import { useEffect, useId, useRef } from "react";
import type { Film } from "./films";

type BookingDialogProps = {
  /** Film dont on affiche la séance ; le composant est monté/démonté avec lui. */
  film: Film;
  /** Sortie sans réserver : Escape, croix, « Annuler », « Revenir aux films ». */
  onClose: () => void;
  /** Validation explicite de la séance ; jamais déclenchée par une fermeture. */
  onConfirm: (film: Film) => void;
};

export default function BookingDialog({ film, onClose, onConfirm }: BookingDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // `useId` garantit un identifiant unique et stable : le nom accessible du
  // dialogue reste relié à son titre visible, même si plusieurs instances du
  // composant venaient à coexister.
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Le `<dialog>` n'est modal que s'il est ouvert via `showModal()` : c'est
    // cet appel qui expose le rôle `dialog`, rend l'arrière-plan inerte et
    // câble la touche Escape.
    if (!dialog.open) dialog.showModal();
    // On place le focus sur le conteneur nommé plutôt que sur le premier
    // bouton : le dialogue et son titre sont annoncés avant les commandes.
    dialog.focus();
  }, []);

  return (
    <dialog className="modal" ref={dialogRef} tabIndex={-1} aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape : on empêche la fermeture native pour que l'état du parent
        // reste la seule source de vérité et pilote le démontage.
        event.preventDefault();
        onClose();
      }}>
      <div className="dialog-heading">
        <h2 id={titleId}>Réserver {film.title}</h2>
        <button type="button" className="close"
          aria-label={"Fermer la réservation : " + film.title} onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <p>{film.genre} · Séance de {film.time}</p>
      <p className={"availability " + (film.available ? "available" : "unavailable")}>
        {film.available ? "Places disponibles" : "Séance complète"}
      </p>
      <p>
        {film.available
          ? "Confirmez pour retenir une place pour cette séance, ou annulez pour revenir au programme."
          : "Cette séance est complète : aucune place ne peut être retenue."}
      </p>
      {/* Les noms accessibles reprennent le libellé visible puis le complètent
          avec le film et l'horaire : une commande parcourue hors contexte
          reste compréhensible, sans trahir le texte affiché. */}
      <div className="dialog-actions">
        {film.available ? (
          <>
            <button type="button" className="dialog-action"
              aria-label={"Confirmer la réservation : " + film.title + ", séance de " + film.time}
              onClick={() => onConfirm(film)}>
              Confirmer la réservation
            </button>
            <button type="button" className="dialog-action dialog-action--secondary"
              aria-label={"Annuler la réservation : " + film.title} onClick={onClose}>
              Annuler
            </button>
          </>
        ) : (
          <button type="button" className="dialog-action" onClick={onClose}>Revenir aux films</button>
        )}
      </div>
    </dialog>
  );
}
