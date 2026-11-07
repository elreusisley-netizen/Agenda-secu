# Base de données AGENDA SECU (Supabase)

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `INSTALLATION_tout_en_un.sql` | Les 3 fichiers ci-dessous réunis : c'est celui à coller dans Supabase |
| `migrations/…01_schema.sql` | Les 13 tables |
| `migrations/…02_fonctions_et_garde_fous.sql` | Contrôles automatiques : 5 chefs maximum, chevauchements, nombre d'agents requis, notifications, historique |
| `migrations/…03_securite_rls.sql` | Qui peut lire ou modifier quoi (admin, chef selon ses droits, agent) |
| `creer_administrateur.sql` | Donne le rôle d'administrateur au premier compte |
| `tests/` | 50 tests de sécurité exécutés sur une copie locale (pas à lancer dans Supabase) |

## Tables

profils, agents, permissions_chefs, clients, sites, plannings, missions, affectations,
disponibilites (par jour et par créneau jour / nuit), notifications, abonnements_push, historique, parametres.

## Règles principales

- Aucun accès sans connexion.
- Un agent ne voit que son profil, ses disponibilités, ses propositions et missions, et les sites concernés.
- Un agent peut seulement accepter ou refuser une proposition ; il ne peut ni se confirmer ni changer ses informations (sauf son téléphone).
- Un chef ne voit que ce que l'administrateur lui a autorisé, et ne peut pas modifier ses propres droits.
- La base refuse : un 6e chef, deux missions qui se chevauchent pour un même agent (nuits comprises),
  plus d'agents confirmés que le nombre requis, la désactivation du dernier administrateur.
- Toute modification importante est inscrite dans l'historique.
- Les comptes sont créés côté serveur ; le rôle vient des métadonnées « app » (non modifiables par l'utilisateur).
