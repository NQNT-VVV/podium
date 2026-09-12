import type { Metadata } from 'next';
import Link from 'next/link';

import { apiGet } from '@/lib/api';
import type { AuthMe } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Confidentialite et conditions',
  description: 'Ce que Podium garde de vous, pourquoi, combien de temps, et comment partir. Projet sans but commercial.',
};

const RESUME = [
  { mark: '', title: 'AUCUN BUT COMMERCIAL', text: 'Podium est un projet personnel, gratuit, sans publicite, sans revente ni partage de donnees. Un outil technique pour classer des parties entre amis, rien d’autre.' },
  { mark: '', title: 'LE STRICT MINIMUM', text: 'Un identifiant Discord, un pseudo, un emoji d’avatar, et les resultats de vos parties. Ni e-mail, ni nom, ni adresse.' },
  { mark: '', title: 'DEPART LIBRE ET IMMEDIAT', text: 'Suppression du compte en un clic depuis vos reglages, effet immediat. Les comptes inactifs depuis deux ans sont supprimes d’eux-memes.' },
];

export default async function PrivacyPage() {
  const me = await apiGet<AuthMe>('/api/auth/me');
  return (
    <main className="shell narrow legal">
      <header className="page-head">
        <div>
          <div className="kicker"><span>SECTION 0x07</span><span>DONNEES · CONSERVATION · DEPART</span><span>REF. PD-LEG-01</span></div>
          <h1>CONFIDENTIALITE ET CONDITIONS</h1>
          <p>
            Podium relie des mini-jeux — Refrain, Arena, et ceux qui viendront — a un classement commun. Cette page
            decrit exactement ce que le service fait de vos donnees, et surtout ce qu’il ne fait pas.
          </p>
        </div>
      </header>

      <div className="legal-summary">
        {RESUME.map((r) => (
          <div key={r.title}>
            <span className="mark" aria-hidden="true">{r.mark}</span>
            <b>{r.title}</b>
            <span>{r.text}</span>
          </div>
        ))}
      </div>

      <section className="legal-section">
        <h2>QUI, ET POURQUOI</h2>
        <p>
          Podium est edite et heberge par <b>danwalex</b>, a titre personnel. Il n’a <b>aucun but commercial</b> :
          pas de publicite, pas de mesure d’audience tierce, pas de vente, de location ni de partage de donnees, pas de
          profilage. Sa seule finalite est <b>technique</b> : reconnaitre un joueur d’un jeu a l’autre, classer les
          parties, tenir une saison et des defis. Le code est public.
        </p>
      </section>

      <section className="legal-section">
        <h2>VOS DONNEES</h2>

        <h3>LE COMPTE</h3>
        <p>
          A la connexion par Discord, Podium recoit votre <b>identifiant Discord</b>, votre nom d’affichage et
          l’adresse de votre avatar. Il conserve l’identifiant et le nom ; l’avatar Discord n’est pas garde, vous
          choisissez un emoji a la place. La portee demandee est <code>identify</code> : <b>aucun acces</b> a vos
          messages, a vos serveurs, a votre e-mail ni a vos amis. Discord, de son cote, voit que vous vous connectez
          a Podium ; sa politique s’applique a cette etape.
        </p>
        <p>
          S’y ajoutent le <b>pseudo</b> que vous choisissez (modifiable), un emoji d’avatar, la date de creation du
          compte et celle de votre derniere visite. Lorsque la connexion par mot de passe est active, le mot de passe
          est stocke sous forme de hachage <code>scrypt</code>, jamais en clair.
        </p>

        <h3>LES PARTIES</h3>
        <p>
          A la fin d’une partie, le jeu envoie a Podium le classement : jeu, mode, date, duree, et pour chaque joueur
          son pseudo en jeu, son avatar, son score et son rang. Si vous etiez connecte, votre <b>identifiant Podium</b>
          y est joint : c’est ce qui met la partie sur votre profil et fait evoluer votre cote. Podium calcule et
          conserve votre cote Elo par jeu, vos points de saison, vos badges de defis.
        </p>
        <p>
          Les joueurs <b>sans compte</b> apparaissent dans l’historique d’une partie sous le pseudo qu’ils ont tape en
          jeu, sans autre information, et n’entrent dans aucun classement.
        </p>

        <h3>COOKIES</h3>
        <ul>
          <li><b><code>podium_session</code></b> — votre session sur le hub. Aleatoire, seul son hachage est stocke, 30 jours.</li>
          <li>
            <b><code>nqnt_id</code></b> — votre identite signee (identifiant, pseudo, avatar), posee sur le domaine
            <code>.danwalex.com</code> pour que les jeux vous reconnaissent sans nouvelle connexion. 30 jours,
            renouvele tant que vous etes actif. Il est signe avec un secret partage avec les jeux : personne
            d’exterieur ne peut le fabriquer, mais les jeux relies au hub le peuvent — ils sont tenus par la meme
            personne que Podium, et ce sont eux que le cookie sert a prevenir.
          </li>
          <li><b><code>podium_oauth</code></b> — dix minutes, le temps de la connexion Discord, pour la securiser.</li>
        </ul>
        <p>Aucun cookie tiers, aucun traceur, aucune regie publicitaire. Les polices sont servies par nos propres serveurs.</p>

        <h3>JOURNAUX ET MESURES</h3>
        <p>
          L’hebergement garde des journaux techniques (adresse IP, date, page demandee) necessaires au fonctionnement
          et a la securite, sans profilage. Podium tient un journal des resultats recus des jeux, purge apres 30
          jours, et des compteurs de fonctionnement anonymes (nombre de comptes, de parties, de defis).
        </p>
      </section>

      <section className="legal-section">
        <h2>CONSERVATION ET DEPART</h2>
        <ul>
          <li>
            <b>Compte</b> : tant qu’il est utilise. Sans aucune connexion pendant <b>24 mois</b>, il est supprime
            automatiquement. Les comptes d’administration sont epargnes par cette purge : un hub sans administrateur
            ne se repare plus.
          </li>
          <li><b>Sessions</b> : 30 jours, puis purgees. Chacune retient le navigateur declare, pour que vous puissiez reconnaitre un appareil.</li>
          <li>
            <b>Parties</b> : conservees, car elles appartiennent aussi aux autres joueurs. A la suppression d’un compte,
            sa ligne y devient « Joueur parti », sans identifiant.
          </li>
          <li><b>Messages du salon</b> : 90 jours, puis effaces. Ils partent aussi avec le compte, entierement : ce sont vos mots.</li>
          <li>
            <b>Avis et signalements</b> : le texte que vous ecrivez part avec votre compte. La note chiffree reste,
            detachee de vous et de toute page — c’est elle qui fait la moyenne, et l’effacer reecrirait une mesure
            qui ne designe plus personne.
          </li>
          <li><b>Journal des resultats</b> : 30 jours.</li>
        </ul>
        <p>
          <b>Partir se fait seul, immediatement</b> : dans vos reglages, « Supprimer mon compte » efface le compte, les
          sessions, les cotes, les badges et vos messages du salon, anonymise vos lignes dans les parties et retire le
          texte de vos avis. Aucune demande a formuler, aucun delai.
        </p>
      </section>

      <section className="legal-section">
        <h2>VOS DROITS</h2>
        <p>
          Le reglement europeen vous donne un droit d’acces, de rectification, d’effacement et de portabilite. Ici, tout
          est a portee de main : votre profil public montre ce que les autres voient ; vos reglages permettent de
          modifier pseudo et avatar, de <b>telecharger toutes vos donnees</b> en JSON, et de supprimer le compte. Pour
          toute autre question, contactez <b>danwalex</b>.
        </p>
        {me.user ? (
          <p><Link className="btn" href="/moi">OUVRIR MES REGLAGES</Link></p>
        ) : (
          <p className="meta">CONNECTEZ-VOUS POUR ACCEDER A CES REGLAGES.</p>
        )}
      </section>

      <section className="legal-section">
        <h2>CONDITIONS D’UTILISATION</h2>
        <h3>LE SERVICE</h3>
        <p>
          Podium est mis a disposition <b>gratuitement</b>, sans engagement ni contrepartie. Il est en <b>beta</b> :
          il peut evoluer, s’interrompre ou perdre des donnees sans preavis. Aucune garantie de disponibilite n’est
          donnee ; le service est fourni « en l’etat ».
        </p>
        <h3>USAGE ATTENDU</h3>
        <ul>
          <li>Un pseudo correct : il s’affiche sur les classements de tout le monde.</li>
          <li>Pas de triche : envoyer de faux resultats, usurper un compte ou contourner les jeux entraine le retrait du compte.</li>
          <li>Un usage prive et amical, sans contrepartie financiere.</li>
        </ul>
        <h3>LES JEUX</h3>
        <p>
          Chaque jeu reste un service distinct, avec ses propres regles et sa propre page de donnees. Podium ne fait
          que recevoir leurs classements et publier leur calendrier de defis.
        </p>
      </section>

      <p className="legal-updated">
        Cette page decrit le fonctionnement reel du service et est mise a jour avec lui. Une question ? <b>danwalex</b>.
      </p>
    </main>
  );
}
