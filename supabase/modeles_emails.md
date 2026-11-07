# Modèles d'e-mails en français (Supabase > Authentication > Emails)

Copier chaque bloc dans le modèle correspondant, puis « Save ».

## Invite user (invitation d'un nouvel agent)

Objet : `Votre accès à AGENDA SECU`

```html
<h2>Bienvenue sur AGENDA SECU</h2>
<p>Votre responsable vous a créé un compte pour consulter vos plannings et indiquer vos disponibilités.</p>
<p><a href="{{ .ConfirmationURL }}">Activer mon compte et choisir mon mot de passe</a></p>
<p>Ouvrez ce lien depuis votre téléphone. S'il a expiré, utilisez « Mot de passe oublié ? » sur l'écran de connexion.</p>
```

## Reset password (mot de passe oublié)

Objet : `Réinitialisation de votre mot de passe AGENDA SECU`

```html
<h2>Nouveau mot de passe</h2>
<p>Vous avez demandé à changer votre mot de passe AGENDA SECU.</p>
<p><a href="{{ .ConfirmationURL }}">Choisir un nouveau mot de passe</a></p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe actuel reste valable.</p>
```
