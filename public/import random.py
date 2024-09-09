import random

# Liste des éléments pour générer le mot de passe
elements = ['mac', 'roy', 'yvana', 'leukeu', '*', '.',]

def generer_mot_de_passe():
    # Choisir des éléments de manière aléatoire pour créer un mot de passe de 9 caractères
    mot_de_passe = ''
    while len(mot_de_passe) < 9:
        mot_de_passe += random.choice(elements)
        if len(mot_de_passe) > 9:
            mot_de_passe = mot_de_passe[:9]
    return mot_de_passe

def generer_plusieurs_mots_de_passe(nombre):
    mots_de_passe = []
    for _ in range(nombre):
        mots_de_passe.append(generer_mot_de_passe())
    return mots_de_passe

# Exemple d'utilisation pour générer 5 mots de passe
nombre_mots_de_passe = 1000
mots_de_passe = generer_plusieurs_mots_de_passe(nombre_mots_de_passe)

# Afficher les mots de passe générés
for i, mot in enumerate(mots_de_passe, 1):
    print(f"Mot de passe {i}: {mot}")
