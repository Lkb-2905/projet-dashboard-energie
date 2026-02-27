# 🔰 DOSSIER DE SÉCURITÉ ET CONTINUITÉ (PCR/PRA)
# ⚡ SP-E : Système de Pilotage Énergétique
**Gestion de Crise • Continuité Logistique • Résilience IA**

**Classification:** Confidentiel (Interne Acme Energy) | **Version:** 1.2.0  
**Responsable:** KAMENI TCHOUATCHEU GAETAN BRUNEL

---

🔍 **[Analyse BIA](#-analyse-biam)** • 🛡️ **[Stratégies PCA](#-stratégies-de-continuité-pca)** • 🔄 **[Procédures PRA](#-procédures-de-reprise-pra)** • 📝 **[Maintenance MCO](#-maintenance--tests-mco)**

---

## 📋 TABLE DES MATIÈRES
1.  [Contexte & Enjeux Critiques](#-contexte-et-enjeux-critiques)
2.  [Analyse d'Impact Métier (BIA)](#-analyse-d-impact-m%C3%A9tier-bia)
3.  [Stratégies de Continuité (PCA)](#-strat%C3%A9gies-de-continuit%C3%A9-pca)
4.  [Procédures de Reprise (PRA)](#-proc%C3%A9dures-de-reprise-pra)
5.  [Maintenance & Tests (MCO)](#-maintenance--tests-mco)
6.  [Annexe Technique](#-annexe-technique)

---

## 🚨 CONTEXTE ET ENJEUX CRITIQUES

Ce plan définit la stratégie de **résilience opérationnelle** du Dashboard SP-E.  
Dans un contexte de **Flux Tendus (Just-in-Time)** sur la Supply Chain, toute interruption de service > 1h entraîne une perte de visibilité sur l'équilibre *Offre/Demande*.

**Objectifs du PCR :**
*   **Disponibilité (99.9%) :** Garantir l'affichage des KPIs même en mode dégradé.
*   **Intégrité IA :** Assurer que les prédictions (Python) restent cohérentes ou sont remplacées par des modèles statistiques de repli.
*   **Traçabilité :** Tout incident doit être logué pour le RETEX (Retour d'Expérience).

---

## 🔍 ANALYSE D'IMPACT MÉTIER (BIA)

### Cartographie des Risques

| Menace Identifiée | Probabilité | Impact Métier | Sévérité |
| :--- | :---: | :--- | :---: |
| **Coupure API Externe** (Météo) | Élevée (3/5) | Perte des données climatiques temps réel. | 🟠 Majeur |
| **Crash Moteur Python** | Moyenne (2/5) | Impossibilité de régénérer les prévisions à J+1. | 🟠 Majeur |
| **Panne Serveur Node.js** | Faible (1/5) | "Blackout" complet pour l'opérateur (Écran blanc). | 🔴 Critique |
| **Corruption Base de Données** | Très Faible | Perte de l'historique long terme. | 🔴 Critique |

### Métriques de Performance (SLA)
*   **RTO (Recovery Time Objective)** : < 5 minutes.
    *   *Temps maximal toléré pour relancer le service critique.*
*   **RPO (Recovery Point Objective)** : < 1 heure.
    *   *Perte de données maximale acceptable en cas de crash.*

---

## 🛡️ STRATÉGIES DE CONTINUITÉ (PCA)

Le PCA repose sur l'approche **"Failover-By-Design"** : le système est conçu pour dégrader ses fonctionnalités sans s'arrêter.

### 1. Gestion de la Défaillance des Données (Auto-Fallback)
Le backend Node.js intègre un circuit breaker pattern.

*   **⚡ Mode Nominal :** Le système interroge `api.open-meteo.com`.
*   **🚨 Incident Détecté :** Timeout > 5000ms ou HTTP 5xx.
*   **🔄 Basculement Auto :** Le servie `DataService` bascule instantanément sur le **Générateur Synthétique Local**.
*   **👁️ Conséquence Utilisateur :** Transparence totale. Une notification "Mode Estimation" apparaît, mais le pilotage continue.

### 2. Résilience du Moteur IA
Le module Data Science est asynchrone et découplé.

*   **Problème :** Le script Python ne répond plus ou crashe (Memory Leak).
*   **Solution :** L'API sert la dernière version du fichier `predictions.json` mise en cache.
*   **Bénéfice :** L'opérateur conserve la vision prédictive précédente (J-1) plutôt qu'une absence d'information.

---

## 🔄 PROCÉDURES DE REPRISE (PRA)

En cas d'incident majeur nécessitant une intervention humaine, suivre cette procédure stricte.

### 4.1. Protocole "FAST REBOOT"
Si le Dashboard ne répond plus, l'astreinte technique doit exécuter le script PowerShell d'urgence :

```powershell
# SCRIPT DE RÉCUPÉRATION D'URGENCE (Windows)

# 1. Kill des processus zombies
Stop-Process -Name "node", "python" -Force -ErrorAction SilentlyContinue 
Write-Host "✅ Processus nettoyés."

# 2. Purge des caches corrompus
Remove-Item "data-science/predictions.json" -ErrorAction SilentlyContinue
Write-Host "✅ Cache IA purgé."

# 3. Relance Séquentielle
Start-Process "npm" -ArgumentList "run dev" -WorkingDirectory "./server"
Start-Process "npm" -ArgumentList "run dev" -WorkingDirectory "./client"
Write-Host "🚀 Services redémarrés. Tentative de régénération IA..."

# 4. Forçage du recalcul IA
Invoke-WebRequest -Method Post -Uri "http://localhost:4000/api/predictions/generate"
```

### 4.2. Stratégie de Sauvegarde (Backup)
*   **Code Source :** Réplication Git temps réel (GitHub + GitLab Interne).
*   **Données Critiques :** Les données exportées par les opérateurs (CSV/PDF) sont stockées localement sur les postes de travail (Local First), garantissant une continuité décentralisée.

---

## 📝 MAINTENANCE & TESTS (MCO)

La résilience se teste. Un exercice de simulation est obligatoire tous les trimestres.

### Scénarios de Test
1.  **"Chaos Monkey" Réseau :**
    *   *Action :* Couper la connexion internet du serveur.
    *   *Attendu :* Le Dashboard doit passer en mode "Simulé" sans erreur 500.
2.  **"Crash Test" Python :**
    *   *Action :* Supprimer `analysis.py` pendant l'exécution.
    *   *Attendu :* L'API doit retourner le JSON en cache ou une erreur "Service Indisponible" propre (404/503), sans planter le Node.js.

---

## 🔧 ANNEXE TECHNIQUE

### Contacts d'Astreinte
*   **Responsable Technique :** Kameni Tchouatcheu (Ext. 06.XX.XX.XX.XX)
*   **Support DevOps :** support-it@acme-energy.com

### Versions Validées
*   **Python :** 3.12.x (Dépendances figées via `requirements.txt`)
*   **Node.js :** 20.x LTS

---
*Ce document est la propriété de la Direction Supply & Logistique.*
**Dernière mise à jour :** 19/02/2026 par G.B.K.T.
