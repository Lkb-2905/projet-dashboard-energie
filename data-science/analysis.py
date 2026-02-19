
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
import json
import datetime
import os

def generate_predictions():
    # 1. Charger les données (Simulation ou lecture d'un CSV existant)
    # Pour cet exemple, on peut lire le fichier CSV s'il existe, sinon on génère des données
    csv_file = os.path.join(os.path.dirname(__file__), '..', 'energie-2026-01-22-au-2026-01-24.csv')
    
    if os.path.exists(csv_file):
        df = pd.read_csv(csv_file, sep=';')
        # Conversion du timestamp
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    else:
        # Fallback: données générées
        print(f"Warning: {csv_file} not found. Using generated data.")
        dates = pd.date_range(start='2026-01-22', periods=72, freq='h')
        df = pd.DataFrame({
            'timestamp': dates,
            'consumption': np.random.randint(90, 180, size=len(dates)),
            'production': np.random.randint(60, 130, size=len(dates))
        })

    # 2. Préparation des données pour Le Machine Learning (Régression Linéaire simple)
    # On va prédire la consommation basée sur l'heure de la journée (cycle journalier)
    
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_year'] = df['timestamp'].dt.dayofyear
    
    # Feature Engineering simple: on utilise l'heure comme feature
    # Pour un cycle, on pourrait utiliser sin/cos de l'heure, mais restons simple pour l'exemple
    X = df[['hour']]
    y = df['consumption']
    
    model = LinearRegression()
    model.fit(X, y)
    
    # 3. Prédiction pour les prochaines 24 heures
    last_timestamp = df['timestamp'].max()
    future_dates = [last_timestamp + datetime.timedelta(hours=x+1) for x in range(24)]
    
    future_df = pd.DataFrame({'timestamp': future_dates})
    future_df['hour'] = future_df['timestamp'].dt.hour
    
    predictions = model.predict(future_df[['hour']])
    
    # Ajout d'un peu de bruit aléatoire pour rendre la courbe moins "parfaite/plate" et plus réaliste
    noise = np.random.normal(0, 5, len(predictions))
    predictions = predictions + noise
    
    # 4. Export des résultats en JSON
    results = []
    for date, pred in zip(future_dates, predictions):
        results.append({
            'timestamp': date.isoformat(),
            'predicted_consumption': round(float(pred), 2)
        })
        
    output_path = os.path.join(os.path.dirname(__file__), 'predictions.json')
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
        
    print(f"Predictions generated and saved to {output_path}")

if __name__ == "__main__":
    generate_predictions()
