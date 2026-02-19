# 🛡️ PCR - Plan de Continuité et de Reprise d'Activité
> **Système de Supervision Énergétique (SP-E)**  
> **Classification :** Interne / Critique  
> **Version :** 1.0 - Production  
> **Responsable :** [Votre Nom]

---

## 1. Contexte et Enjeux Critiques
Ce document définit la stratégie de **résilience** et de **remise en service** de la plateforme de supervision énergétique SP-E.  
Dans un contexte de **pilotage logistique (Supply Chain)** au sein de TotalEnergies, l'indisponibilité de cet outil entraînerait une perte de visibilité sur les flux, compromettant la prise de décision opérationnelle.

**Objectifs du PCR :**
1.  Garantir la disponibilité des indicateurs clés (KPI) même en cas de panne externe.
2.  Assurer l'intégrité des modèles prédictifs (IA).
3.  Minimiser le temps d'interruption (RTO) et la perte de données (RPO).

---

## 2. Analyse des Risques et Impact (BIA)

| Risque Identifié | Probabilité | Impact Métier | Sévérité |
| :--- | :---: | :--- | :---: |
| **Panne API Externe (Open-Meteo)** | Forte | Perte des données temps réel externes. | 🟠 Majeur |
| **Crash du Moteur IA (Python)** | Moyenne | Indisponibilité des prévisions à J+1. | 🟠 Majeur |
| **Crash Serveur Application (Node.js)** | Faible | Écran noir pour les opérateurs. | 🔴 Critique |
| **Perte de connectivité Base de Données** | Faible | Impossibilité de lire l'historique. | 🔴 Critique |

---

## 3. Stratégies de Continuité (PCA - Business Continuity)

Le PCA repose sur une architecture **"Failover-By-Design"** (Basculement par conception).

### 3.1. Gestion de la Défaillance des Données (Fallback Automatique)
L'application intègre un mécanisme de **redondance hybride** au niveau du backend Node.js.

*   **Mode Nominal :** Le système interroge l'API Open-Meteo pour les données réelles.
*   **Incident détecté :** Timeout > 5000ms ou erreur 500 sur l'API externe.
*   **Basculement (Failover) :** Le backend bascule **instantanément et automatiquement** sur le générateur de données simulées (`generateSeries`).
*   **Résultat pour l'utilisateur :** Transparence totale. Le Dashboard reste fonctionnel, une notification "Mode Dégradé" alerte l'opérateur que les données sont estimées.

### 3.2. Continuité du Service IA
Le module de Data Science est découplé (architecture asynchrone).
*   En cas de non-réponse du script Python, l'API sert la **dernière prédiction validée** (mise en cache JSON).
*   L'opérationnel conserve la vision J+1 précédente plutôt qu'une absence d'information.

---

## 4. Stratégies de Reprise (PRA - Disaster Recovery)

En cas de crash système majeur, les procédures suivantes s'appliquent pour respecter les SLA.

### 4.1. Indicateurs de Performance (SLA)
*   **RTO (Recovery Time Objective) :** < 5 minutes. (Temps max. pour relancer le service).
*   **RPO (Recovery Point Objective) :** < 1 heure. (Perte de données max. tolérée).

### 4.2. Procédure de Restauration Rapide (Fast Recovery)
Le projet est conçu pour être "Stateless" et conteneurisable, permettant une réinstanciation immédiate.

**Script de relance d'urgence (PowerShell) :**
```powershell
# 1. Arrêt forcé des processus zombie
Stop-Process -Name "node", "python" -Force -ErrorAction SilentlyContinue

# 2. Nettoyage des caches temporaires
Remove-Item "data-science/predictions.json" -ErrorAction SilentlyContinue

# 3. Redémarrage Séquentiel
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "./server"
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "./client"

# 4. Régénération à froid des modèles IA
Invoke-WebRequest -Method Post -Uri "http://localhost:4000/api/predictions/generate"
```

### 4.3. Gestion des Sauvegardes
*   **Code Source :** Versionning Git avec réplication distante.
*   **Données Critiques :** Les données logistiques exportées (CSV/PDF) sont stockées localement sur les postes clients, assurant une décentralisation de l'information.

---

## 5. Tests et Maintenance du Plan (MCO)

Pour garantir l'efficacité de ce PCR, des simulations sont effectuées :
1.  **Test de coupure réseau :** Simulation d'indisponibilité d'Open-Meteo pour valider le passage en mode "Simulé".
2.  **Test de corruption IA :** Suppression du fichier `predictions.json` pour vérifier la résilience de l'API.

> **Validation :** Ce plan assure que l'outil de pilotage reste disponible à **99.9%** pour les équipes Supply Chain de TotalEnergies.
