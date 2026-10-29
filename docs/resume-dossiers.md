---
title: Reprendre le fil
summary: Dossiers personnels, prochaines actions et attentes avec une date de suivi indépendante des échéances.
audience: developer
section: Reference
order: 99
specs: []
screens: []
---
# Reprendre le fil

Un dossier relie des tâches existantes dans un ordre choisi. Les tâches restent
dans leurs listes : créer un dossier ne change ni leur parent, ni leur date, ni
leur état d'avancement. Aucun dossier n'est créé à partir des données de la
personne sans son action.

## Composer un dossier

Depuis **Reprendre le fil**, créer un dossier, lui donner un nom et y rattacher
des tâches. L'ordre du dossier détermine sa prochaine étape : la première tâche
encore ouverte. Les tâches terminées restent dans le fil. Rouvrir une étape
antérieure la rend de nouveau actuelle. Détacher une tâche ne supprime pas la
tâche ; supprimer le dossier ne supprime pas ses tâches.

Un dossier est personnel. Il peut référencer des tâches visibles de plusieurs
listes. Les droits de chaque tâche continuent de s'appliquer à sa modification
et à sa réalisation. Une tâche devenue inaccessible ou supprimée est signalée
comme indisponible ; le dossier ne réécrit pas silencieusement son contenu.

## Attendre et reprendre

Mettre un dossier en attente permet de préciser ce qui est attendu et,
facultativement, une date de suivi. Cette date indique quand revenir voir le
dossier. Elle ne change pas l'échéance des tâches et ne programme pas de
notification.

La carte du dossier en attente, dans **Reprendre le fil**, **Ma journée** et
**En attente**, affiche cette date dans un champ modifiable (« Revoir le »).
Le champ n'est en lecture seule que si aucune étape du dossier ne peut être
modifiée par la personne. Modifier la date n'écrit que sur le dossier, et
l'annulation reste disponible.

Une date de suivi passée s'affiche « Revoir depuis le » dans la couleur
d'attention ; une date à venir reste lisible dans la couleur du texte.

Sur la carte principale, **Pas maintenant** met le dossier en attente jusqu'au
lendemain, avec l'attente « Pas maintenant » et la date de suivi. Aucune tâche
n'est modifiée, et l'annulation reste disponible. Une note unique, sous
**Nouveau dossier**, rappelle ce qu'est un dossier ; la fermer n'est mémorisé
que sur cet appareil.

La vue **En attente** rassemble ces dossiers avec les autres attentes déjà
présentes dans l'application. Reprendre un dossier efface son attente et sa
date de suivi ; la prochaine tâche ouverte redevient l'étape à avancer.

Par exemple, un dossier de remplacement des pneus peut contenir la commande,
la réception, le rendez-vous de montage et la géométrie. Après la commande,
la personne décide de mettre le dossier en attente de livraison. À la réception,
elle reprend le dossier et termine l'étape correspondante. L'application ne
déduit aucune de ces réalisations du titre des tâches.

Depuis le menu d'actions d'une tâche ouverte, **Ajouter à un dossier** rattache
la tâche à un dossier existant ou crée un dossier qui la contient. La tâche
reste dans sa liste ; l'action est annulable en une fois.

## Choisir son moment

Le soleil choisit un dossier pour **Ma journée**, indépendamment des dates de
ses tâches. La sélection est propre au jour courant. Les contextes s'appuient
sur les étiquettes existantes : aucun contexte n'est attribué automatiquement.

## Capturer et rattacher

Une suggestion locale peut rapprocher le texte d'une nouvelle tâche du nom,
de la note ou des tâches d'un dossier. Cette comparaison fonctionne sans
modèle et ne transmet pas de texte à un fournisseur. La suggestion indique
sa source. Le rattachement demande une confirmation ; ignorer la suggestion
conserve la tâche créée. Les actions du dossier proposent l'annulation selon
le mécanisme habituel de l'application.

## Conservation et synchronisation

Le dossier est une entité supplémentaire du journal d'opérations. Son contenu
se synchronise comme les autres données ; ses textes suivent le chiffrement
de bout en bout lorsque celui-ci est actif. Les exports et imports propres à
OpenTodo conservent les dossiers. Aucun nouveau service ni paramètre obligatoire
n'est nécessaire.

Les spécifications et les résultats de validation de cette intégration sont
suivis dans `openspec/changes/resume-dossiers/`. Les mesures finales de taille
et les vérifications dans le navigateur y seront consignées après assemblage.
