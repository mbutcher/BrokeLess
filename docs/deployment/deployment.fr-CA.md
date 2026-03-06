# BudgetApp — Guide d'installation

**Aussi disponible en :** [English](deployment.md)

> **Pour qui :** Utilisateurs d'Unraid à l'aise avec le Terminal et les Applications communautaires. Aucune connaissance en programmation requise.

---

## Ce dont vous aurez besoin avant de commencer

- **Unraid 6.12 ou plus récent**
- **Docker Compose Manager** installé depuis les Applications communautaires (recherchez « Docker Compose Manager » par dcflachs)
- **Nginx Proxy Manager** installé depuis les Applications communautaires (pour l'accès depuis l'extérieur de votre réseau)
- Un nom de domaine pointant vers votre IP résidentielle, ou un nom d'hôte local comme `budget.lan`

---

## 1. Installer BudgetApp

Ouvrez un Terminal Unraid et exécutez ces trois commandes :

```bash
git clone https://github.com/mbutcher/BudgetApp /mnt/user/repos/BudgetApp
cd /mnt/user/repos/BudgetApp
./scripts/setup/setup-prod.sh
```

Le script d'installation vous demandera votre nom de domaine, puis s'occupera du reste automatiquement — génération de vos clés de sécurité, création de tous les dossiers nécessaires et démarrage de l'application.

Une fois terminé, BudgetApp sera accessible sur le port **3000**.

> **Optionnel :** Passez votre nom de domaine directement pour éviter la question :
> ```bash
> ./scripts/setup/setup-prod.sh --domain budget.votredomaine.com
> ```

---

## 2. Sauvegarder votre Secret principal

La première fois que vous ouvrez BudgetApp dans un navigateur, un écran vous demandera de sauvegarder votre **Secret principal** avant de pouvoir créer un compte.

**C'est l'étape la plus importante.** Votre Secret principal est une longue chaîne de lettres et de chiffres qui protège toutes vos données. Si vous devez un jour déplacer BudgetApp vers un nouveau serveur, c'est ce dont vous aurez besoin pour le restaurer.

1. Cliquez sur **Copier** pour copier le Secret principal dans le presse-papiers.
2. Collez-le dans un gestionnaire de mots de passe (1Password, Bitwarden, etc.) ou notez-le et rangez-le en lieu sûr.
3. Cochez la case de confirmation et cliquez sur **Continuer** pour passer à la création de compte.

Une fois cet écran fermé, le secret ne sera plus jamais affiché.

---

## 3. Configurer Nginx Proxy Manager (pour l'accès externe)

Si vous souhaitez accéder à BudgetApp depuis l'extérieur de votre réseau avec un vrai nom de domaine et HTTPS, configurez un Proxy Host dans Nginx Proxy Manager :

1. Ouvrez Nginx Proxy Manager et allez dans **Proxy Hosts → Add Proxy Host**.
2. Remplissez l'onglet **Details** :
   - **Domain Names :** `budget.votredomaine.com`
   - **Forward Hostname / IP :** l'adresse IP de votre serveur Unraid
   - **Forward Port :** `3000`
   - Activez **Websockets Support**
3. Dans l'onglet **SSL** :
   - Sélectionnez **Request a new SSL Certificate**
   - Activez **Force SSL**
4. Dans l'onglet **Advanced**, collez ceci dans la zone de configuration Nginx personnalisée :

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Real-IP $remote_addr;
```

5. Cliquez sur **Save**.

BudgetApp est maintenant accessible à l'adresse `https://budget.votredomaine.com`.

---

## 4. Sauvegarde

BudgetApp stocke toutes ses données à deux endroits. Sauvegardez les deux régulièrement.

| Quoi | Où sur votre serveur Unraid |
|------|-----------------------------|
| Toutes les données de l'application (base de données, sessions, fichiers) | `/mnt/user/appdata/budget-app/` |
| Secret principal | `secrets/production/master_secret.txt` (dans le dossier du dépôt BudgetApp) |

**Le fichier Secret principal est petit mais essentiel.** Copiez-le hors du serveur (gestionnaire de mots de passe, clé USB chiffrée, autre emplacement). Tout le reste peut être reconstruit à partir de celui-ci.

Pour le dossier de données, utilisez les outils de sauvegarde intégrés d'Unraid ou le plugin **CA Backup / Restore** pour planifier des copies régulières vers un partage ou un disque externe.

---

## 5. Mise à jour

```bash
cd /mnt/user/repos/BudgetApp
git pull
docker compose -f docker/docker-compose.prod.yml down
docker compose -f docker/docker-compose.prod.yml up -d --build
```

Les mises à jour de la base de données sont appliquées automatiquement au démarrage de l'application.

---

## 6. Restauration / Reprise après sinistre

### Déménagement vers un nouveau serveur (ou reconstruction après une panne)

1. Installez Docker et Docker Compose sur le nouveau serveur.
2. Clonez le dépôt BudgetApp au même chemin.
3. Copiez votre dossier de sauvegarde `/mnt/user/appdata/budget-app/` vers le nouveau serveur.
4. Restaurez vos clés de sécurité à partir de votre Secret principal :

```bash
cd /mnt/user/repos/BudgetApp
./scripts/setup/derive-secrets.sh VOTRE-SECRET-PRINCIPAL-ICI
```

5. Démarrez l'application :

```bash
docker compose -f docker/docker-compose.prod.yml up -d --build
```

Vos données et paramètres seront exactement comme vous les aviez laissés.

---

## Dépannage

### L'application ne démarre pas

```bash
docker compose -f docker/docker-compose.prod.yml logs
```

Consultez les messages d'erreur. Causes fréquentes :

- **Fichiers secrets manquants** — relancez `./scripts/setup/setup-prod.sh` depuis le dossier du dépôt.
- **Port 3000 déjà utilisé** — un autre conteneur utilise ce port. Changez-le en modifiant `FRONTEND_PORT` dans `secrets/production/.env`, puis redémarrez.

### L'application démarre mais je ne peux pas me connecter / erreurs WebAuthn

Assurez-vous que le nom de domaine dans Nginx Proxy Manager correspond exactement au domaine utilisé lors de l'installation. Un nom d'hôte incorrect empêchera les clés d'accès et les fonctions de sécurité de fonctionner.

### Vérifier si l'application est en cours d'exécution

```bash
docker compose -f docker/docker-compose.prod.yml ps
```

Les quatre services (`budget_frontend`, `budget_backend`, `budget_mariadb`, `budget_redis`) doivent afficher **Up**.

### Problèmes de certificat SSL

Le SSL est entièrement géré par Nginx Proxy Manager. Si vous voyez des erreurs de certificat, vérifiez le statut du certificat dans le panneau d'administration de NPM. Assurez-vous que le proxy host transfère vers `http://` (et non `https://`) — NPM gère la connexion sécurisée de son côté.
