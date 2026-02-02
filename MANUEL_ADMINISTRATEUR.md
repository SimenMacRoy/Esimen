# Manuel Administrateur - Shek's House

Guide complet pour la gestion de votre boutique en ligne **Shek's House**.

---

## Table des Matières

1. [Accès Administrateur](#1-accès-administrateur)
2. [Tableau de Bord Profil](#2-tableau-de-bord-profil)
3. [Gestion des Produits](#3-gestion-des-produits)
4. [Gestion du Catalogue](#4-gestion-du-catalogue)
5. [Gestion des Coupons](#5-gestion-des-coupons)
6. [Gestion des Utilisateurs](#6-gestion-des-utilisateurs)
7. [Gestion des Commandes](#7-gestion-des-commandes)
8. [Configuration Technique](#8-configuration-technique)

---

## 1. Accès Administrateur

### Comment devenir administrateur
Un compte utilisateur devient administrateur lorsque le champ `is_admin` est défini à `1` dans la base de données.

### Se connecter en tant qu'admin
1. Allez sur le site
2. Cliquez sur **Profil**
3. Connectez-vous avec vos identifiants administrateur
4. Vous verrez les boutons d'administration supplémentaires

### Fonctionnalités Admin
En tant qu'administrateur, vous avez accès à:
- **Ajouter un Produit**: Créer de nouveaux articles
- **Gérer les Produits**: Modifier/supprimer les articles existants
- **Gérer les Utilisateurs**: Voir et gérer les comptes clients
- **Gérer le Catalogue**: Départements et catégories
- **Gérer les Coupons**: Créer des codes promotionnels

---

## 2. Tableau de Bord Profil

Après connexion, votre page profil affiche:

### Section Informations
- Votre nom et email
- Photo de profil
- Bouton de déconnexion

### Boutons Admin (visibles uniquement pour les admins)
| Bouton | Description |
|--------|-------------|
| **Ajouter un Produit** | Créer un nouvel article |
| **Gérer les Produits** | Liste des produits existants |
| **Gérer les Utilisateurs** | Liste des clients |
| **Gérer le Catalogue** | Départements et catégories |
| **Gérer les Coupons** | Codes promotionnels |

---

## 3. Gestion des Produits

### 3.1 Ajouter un Produit

**Accès**: Profil → **Ajouter un Produit**

#### Étapes:
1. Remplissez le formulaire:
   - **Nom du produit** (obligatoire): Ex: "Robe d'été fleurie"
   - **Description**: Description détaillée du produit
   - **Prix** (obligatoire): Prix en dollars canadiens (ex: 49.99)
   - **Stock** (obligatoire): Quantité disponible
   - **Département**: Femme, Homme, Enfant, ou Maison
   - **Catégorie**: Robes, Pantalons, Chemises, etc.

2. Ajoutez des images:
   - Cliquez sur **"Choisir des images"**
   - Sélectionnez une ou plusieurs images (formats: JPG, PNG)
   - L'image principale sera la première affichée
   - Maximum recommandé: 5 images par produit

3. Cliquez sur **"Ajouter le produit"**

#### Conseils pour les images:
- Taille recommandée: 800x800 pixels minimum
- Format carré pour un meilleur affichage
- Fond neutre de préférence
- Montrez le produit sous différents angles

### 3.2 Gérer les Produits Existants

**Accès**: Profil → **Gérer les Produits**

#### Liste des produits
Vous verrez tous vos produits avec:
- Image miniature
- Nom du produit
- Prix
- Stock disponible
- Département/Catégorie

#### Actions disponibles

**Modifier un produit:**
1. Cliquez sur le bouton **Modifier** (icône crayon)
2. Modifiez les informations souhaitées
3. Cliquez sur **"Enregistrer"**

**Supprimer un produit:**
1. Cliquez sur le bouton **Supprimer** (icône poubelle)
2. Confirmez la suppression
3. ⚠️ Cette action est irréversible

**Ajouter un nouveau produit:**
- Cliquez sur le bouton **"+ Ajouter"** en haut de la page

### 3.3 Modifier un Produit

**Page**: modify-product.html

Vous pouvez modifier:
- Nom et description
- Prix et stock
- Département et catégorie
- Images (ajouter/supprimer)

#### Gestion des images:
- Les images existantes sont affichées
- Cliquez sur **X** pour supprimer une image
- Ajoutez de nouvelles images avec le bouton d'upload
- L'ordre des images peut être réorganisé

---

## 4. Gestion du Catalogue

**Accès**: Profil → **Gérer le Catalogue**

### 4.1 Départements

Les départements sont les grandes catégories de votre boutique:
- **Femme**: Articles pour femmes
- **Homme**: Articles pour hommes
- **Enfant**: Articles pour enfants
- **Maison**: Articles pour la maison

#### Ajouter un département:
1. Entrez le nom du département
2. Cliquez sur **"Ajouter"**

#### Supprimer un département:
⚠️ Attention: Supprimer un département affecte tous les produits associés

### 4.2 Catégories

Les catégories sont les sous-divisions des départements:
- Robes, Pantalons, Chemises
- Chaussures, Accessoires
- T-shirts, Vestes, Jupes

#### Ajouter une catégorie:
1. Entrez le nom de la catégorie
2. Sélectionnez les départements associés
3. Cliquez sur **"Ajouter"**

### 4.3 Liaison Département-Catégorie

Une catégorie peut appartenir à plusieurs départements.
Par exemple, "Pantalons" existe dans:
- Femme
- Homme
- Enfant

---

## 5. Gestion des Coupons

**Accès**: Profil → **Gérer les Coupons**

### 5.1 Vue d'ensemble

La page affiche:
- **Statistiques**: Total coupons, coupons actifs, utilisations
- **Liste des coupons**: Avec filtres (Tous, Actifs, Inactifs, Expirés)

### 5.2 Créer un Coupon

Cliquez sur **"+ Nouveau Coupon"**

#### Informations de base:
| Champ | Description | Exemple |
|-------|-------------|---------|
| **Code** | Code unique que les clients entrent | BIENVENUE10 |
| **Nom** | Nom descriptif du coupon | Bienvenue 10% |
| **Description** | Détails de l'offre | 10% sur votre première commande |

#### Type de réduction:

**1. Pourcentage**
- Réduction en pourcentage du total
- Exemple: 10% de réduction
- Valeur: 10

**2. Montant fixe**
- Réduction d'un montant en dollars
- Exemple: 20$ de réduction
- Valeur: 20

**3. Achetez X, Obtenez Y**
- Promotion "Buy X Get Y"
- Quantité à acheter: 2
- Quantité offerte: 1
- Pourcentage de réduction sur l'article offert: 100 (gratuit) ou 50 (50% off)

**4. Livraison gratuite**
- Frais de livraison offerts

#### Conditions:

| Condition | Description |
|-----------|-------------|
| **Montant minimum** | Achat minimum requis (ex: 50$) |
| **Réduction maximum** | Plafond de réduction (pour les %) |
| **Articles minimum** | Nombre minimum d'articles au panier |

#### Restrictions:

**Application du coupon:**
- **Tous les produits**: S'applique à tout
- **Catégorie**: Uniquement sur une catégorie spécifique
- **Département**: Uniquement sur un département
- **Produit**: Uniquement sur un produit spécifique

**Restrictions utilisateur:**
- **Nouveaux clients uniquement**: Première commande seulement
- **Utilisations max. totales**: Limite globale d'utilisation
- **Utilisations par client**: Limite par utilisateur (défaut: 1)

#### Validité:
- **Date de début**: Quand le coupon devient actif
- **Date de fin**: Quand le coupon expire
- **Statut actif**: Activer/désactiver manuellement

### 5.3 Exemples de Coupons

#### Coupon de bienvenue:
```
Code: BIENVENUE15
Type: Pourcentage (15%)
Nouveaux clients: Oui
Validité: 1 an
```

#### Soldes d'été:
```
Code: ETE2024
Type: Pourcentage (20%)
Montant min: 75$
Réduction max: 50$
Département: Femme
Validité: Juillet-Août
```

#### Promotion spéciale:
```
Code: ACHAT2GET1
Type: Achetez 2, Obtenez 1
Articles min: 3
Valeur: 100% (3ème gratuit)
```

### 5.4 Gérer les Coupons Existants

**Modifier un coupon:**
1. Cliquez sur le coupon dans la liste
2. Modifiez les paramètres
3. Enregistrez

**Désactiver un coupon:**
- Changez le statut à "Inactif"
- Le coupon ne sera plus accepté

**Supprimer un coupon:**
- Cliquez sur l'icône poubelle
- Confirmez la suppression

### 5.5 Suivi des Utilisations

Pour chaque coupon, vous pouvez voir:
- Nombre d'utilisations totales
- Montant total économisé par les clients
- Liste des commandes qui ont utilisé le coupon

---

## 6. Gestion des Utilisateurs

**Accès**: Profil → **Gérer les Utilisateurs**

### 6.1 Liste des Utilisateurs

La page affiche tous les comptes clients:
- Nom complet
- Adresse email
- Statut (Admin ou Client)
- Actions disponibles

### 6.2 Actions Disponibles

**Voir les détails:**
- Informations du compte
- Historique des commandes
- Date d'inscription

**Promouvoir en admin:**
- Donne les droits administrateur à un utilisateur
- ⚠️ À utiliser avec précaution

**Rétrograder en client:**
- Retire les droits administrateur

### 6.3 Bonnes Pratiques

- Ne créez pas trop d'administrateurs
- Vérifiez régulièrement les comptes
- Ne supprimez jamais un compte avec des commandes en cours

---

## 7. Gestion des Commandes

### 7.1 Voir les Commandes

Les commandes apparaissent dans:
- **Page Commandes**: Historique complet
- **Notifications**: Nouvelles commandes

### 7.2 Statuts des Commandes

| Statut | Description | Action suivante |
|--------|-------------|-----------------|
| **Confirmée** | Commande reçue | Passer en "Traitement" |
| **En traitement** | Préparation en cours | Passer en "Expédiée" |
| **Expédiée** | Colis envoyé | Passer en "Livrée" |
| **Livrée** | Client a reçu | Aucune |
| **Annulée** | Commande annulée | Aucune |

### 7.3 Modifier le Statut

1. Ouvrez les détails de la commande
2. Sélectionnez le nouveau statut
3. Le client recevra une notification par email

### 7.4 Informations de Commande

Chaque commande contient:
- **Numéro de commande**: Identifiant unique
- **Client**: Nom et coordonnées
- **Articles**: Liste des produits commandés
- **Totaux**: Sous-total, taxes, réductions, total
- **Adresse de livraison**: Adresse complète
- **Paiement**: Référence Stripe

---

## 8. Configuration Technique

### 8.1 Variables d'Environnement (Railway)

Dans Railway, configurez ces variables pour le backend:

| Variable | Description |
|----------|-------------|
| `MYSQLHOST` | `${{MySQL.MYSQLHOST}}` |
| `MYSQLUSER` | `${{MySQL.MYSQLUSER}}` |
| `MYSQLPASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
| `MYSQLDATABASE` | `${{MySQL.MYSQLDATABASE}}` |
| `MYSQLPORT` | `${{MySQL.MYSQLPORT}}` |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Clé secrète unique |
| `STRIPE_SECRET_KEY` | Clé Stripe |
| `ALLOWED_ORIGINS` | URL du frontend |
| `FRONTEND_URL` | URL du frontend |

### 8.2 Configuration Frontend (Netlify)

Le fichier `frontend/js/config.js` contient:
```javascript
var config = {
    baseURL: 'https://votre-backend.railway.app',
    stripePublicKey: 'pk_test_...'
};
```

### 8.3 Stripe (Paiements)

**Mode Test:**
- Utilisez les clés `pk_test_` et `sk_test_`
- Carte de test: 4242 4242 4242 4242

**Mode Production:**
- Utilisez les clés `pk_live_` et `sk_live_`
- Activez votre compte Stripe

### 8.4 Sauvegardes

**Base de données:**
- Railway effectue des sauvegardes automatiques
- Exportez régulièrement vos données importantes

**Images:**
- Stockées dans `/backend/uploads/`
- Considérez un stockage cloud (AWS S3, Cloudinary) pour la production

---

## Résumé des URLs Admin

| Page | URL | Description |
|------|-----|-------------|
| Profil | `/html/profile.html` | Accès aux fonctions admin |
| Ajouter Produit | `/html/add-product.html` | Créer un produit |
| Gérer Produits | `/html/manage-products.html` | Liste des produits |
| Modifier Produit | `/html/modify-product.html?id=X` | Éditer un produit |
| Gérer Utilisateurs | `/html/manage-users.html` | Liste des clients |
| Gérer Catalogue | `/html/manage-catalog.html` | Départements/Catégories |
| Gérer Coupons | `/html/manage-coupons.html` | Codes promo |

---

## Support Technique

Pour toute question technique:
- Consultez les logs dans Railway
- Vérifiez la console du navigateur (F12)
- Contactez le développeur

---

*Manuel mis à jour le 2 février 2026*
