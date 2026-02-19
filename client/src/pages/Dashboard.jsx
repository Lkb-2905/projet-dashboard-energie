import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'react-toastify'
import jsPDF from 'jspdf'
import { api } from '../services/api.js'

const formatDateInput = (date) => date.toISOString().slice(0, 10)

const formatTimeLabel = (value) => {
  const date = new Date(value)
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const formatFullDate = (value) => {
  const date = new Date(value)
  return date.toLocaleString('fr-FR')
}

const buildCsv = (rows) => {
  const headers = ['timestamp', 'consumption', 'production']
  const lines = [
    headers.join(';'),
    ...rows.map((row) => `${row.timestamp};${row.consumption};${row.production}`),
  ]
  return lines.join('\n')
}

function Dashboard({ user, onLogout }) {
  const [range, setRange] = useState(() => {
    const now = new Date()
    const from = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    return { from: formatDateInput(from), to: formatDateInput(now) }
  })
  const [source, setSource] = useState('simulated')
  const [location, setLocation] = useState('paris')
  const [points, setPoints] = useState([])
  const [thresholds, setThresholds] = useState({
    consumptionHigh: 170,
    productionLow: 60,
  })
  const [totals, setTotals] = useState({ consumption: 0, production: 0 })
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchPredictions = async () => {
    try {
      const response = await api.get('/predictions')
      setPredictions(response.data || [])
    } catch (error) {
      console.error('Failed to fetch predictions', error)
      toast.error('Erreur chargement prédictions')
    }
  }

  const handleRegeneratePredictions = async () => {
    setIsGenerating(true)
    try {
      await api.post('/predictions/generate')
      toast.success('Prédictions mises à jour via Python')
      await fetchPredictions()
    } catch (error) {
      console.error('Failed to regenerate predictions', error)
      toast.error('Erreur génération prédictions')
    } finally {
      setIsGenerating(false)
    }
  }

  const alerts = useMemo(() => {
    return points
      .filter(
        (point) =>
          point.consumption >= thresholds.consumptionHigh ||
          point.production <= thresholds.productionLow
      )
      .slice(-8)
      .reverse()
  }, [points, thresholds])

  const chartData = useMemo(() => {
    return points.map((point) => ({
      ...point,
      label: formatTimeLabel(point.timestamp),
    }))
  }, [points])

  const coverageRate = useMemo(() => {
    if (!totals.consumption) return 0
    return Math.round((totals.production / totals.consumption) * 100)
  }, [totals])

  const fetchMetrics = async (currentRange = range) => {
    setLoading(true)
    try {
      const locations = {
        paris: { lat: 48.8566, lon: 2.3522 },
        lyon: { lat: 45.764, lon: 4.8357 },
        marseille: { lat: 43.2965, lon: 5.3698 },
      }
      const coords = locations[location] || locations.paris
      const response = await api.get('/metrics', {
        params: {
          from: `${currentRange.from}T00:00:00`,
          to: `${currentRange.to}T23:59:59`,
          source,
          lat: coords.lat,
          lon: coords.lon,
        },
      })
      setPoints(response.data.points || [])
      setThresholds(response.data.thresholds || thresholds)
      setTotals(response.data.totals || { consumption: 0, production: 0 })
    } catch (error) {
      toast.error('Impossible de charger les données énergétiques.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    fetchPredictions()
  }, [])

  useEffect(() => {
    if (alerts.length > 0) {
      toast.warn(
        `${alerts.length} alertes détectées sur la période sélectionnée.`
      )
    }
  }, [alerts.length])

  const handleFilterSubmit = (event) => {
    event.preventDefault()
    fetchMetrics(range)
  }

  const handleExportCsv = () => {
    const csv = buildCsv(points)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `energie-${range.from}-au-${range.to}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleExportPdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Rapport énergétique', 14, 20)
    doc.setFontSize(11)
    doc.text(`Période: ${range.from} au ${range.to}`, 14, 32)
    doc.text(`Consommation totale: ${totals.consumption} kWh`, 14, 42)
    doc.text(`Production totale: ${totals.production} kWh`, 14, 50)
    doc.text(`Taux de couverture: ${coverageRate}%`, 14, 58)
    doc.text('Dernières alertes:', 14, 70)
    alerts.slice(0, 5).forEach((alert, index) => {
      const y = 80 + index * 8
      doc.text(
        `${formatFullDate(alert.timestamp)} - Consommation ${alert.consumption
        } kWh / Production ${alert.production} kWh`,
        14,
        y
      )
    })
    doc.save(`energie-${range.from}-au-${range.to}.pdf`)
  }

  return (
    <div className="page dashboard-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Supervision énergétique</p>
          <h1>Tableau de bord</h1>
        </div>
        <div className="topbar-actions">
          <div className="user-pill">
            <span>Connecté :</span>
            <strong>{user?.name}</strong>
          </div>
          <button className="secondary-button" onClick={onLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      <section className="grid kpi-grid">
        <div className="card kpi-card">
          <p className="muted">Consommation totale</p>
          <h2>{totals.consumption} kWh</h2>
          <p className="muted">Seuil critique: {thresholds.consumptionHigh} kWh</p>
        </div>
        <div className="card kpi-card">
          <p className="muted">Production totale</p>
          <h2>{totals.production} kWh</h2>
          <p className="muted">Seuil bas: {thresholds.productionLow} kWh</p>
        </div>
        <div className="card kpi-card">
          <p className="muted">Taux de couverture</p>
          <h2>{coverageRate}%</h2>
          <p className="muted">Objectif interne: 95%</p>
        </div>
      </section>

      <section className="card filters-card">
        <form className="filters" onSubmit={handleFilterSubmit}>
          <label>
            Du
            <input
              type="date"
              value={range.from}
              onChange={(event) =>
                setRange((prev) => ({ ...prev, from: event.target.value }))
              }
              required
            />
          </label>
          <label>
            Au
            <input
              type="date"
              value={range.to}
              onChange={(event) =>
                setRange((prev) => ({ ...prev, to: event.target.value }))
              }
              required
            />
          </label>
          <label>
            Source
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <option value="simulated">Simulée</option>
              <option value="real">Open-Meteo</option>
            </select>
          </label>
          <label>
            Zone
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option value="paris">Paris</option>
              <option value="lyon">Lyon</option>
              <option value="marseille">Marseille</option>
            </select>
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Chargement...' : 'Appliquer'}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={handleExportCsv}
            disabled={!points.length}
          >
            Export CSV
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={handleExportPdf}
            disabled={!points.length}
          >
            Export PDF
          </button>
        </form>
      </section>

      <section className="grid chart-grid">
        <div className="card chart-card">
          <div className="card-header">
            <h3>Courbe consommation / production</h3>
            <p className="muted">Historique horaire</p>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `${value} kWh`}
                  labelFormatter={(value) => `Heure: ${value}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="consumption"
                  name="Consommation"
                  stroke="#1f4acc"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="production"
                  name="Production"
                  stroke="#2ec4b6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Prédictions IA (Python)</h3>
              <p className="muted">Probabilité consommation à 24H</p>
            </div>
            <button
              className="secondary-button"
              onClick={handleRegeneratePredictions}
              disabled={isGenerating}
              style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
            >
              {isGenerating ? 'Calcul en cours...' : 'Régénérer via Python'}
            </button>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={predictions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(val) => new Date(val).toLocaleTimeString('fr-FR', { hour: '2-digit' })}
                />
                <YAxis />
                <Tooltip
                  formatter={(value) => `${value} kWh`}
                  labelFormatter={(value) => formatFullDate(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="predicted_consumption"
                  name="Conso. Prédite"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid chart-grid">
        <div className="card chart-card">
          <div className="card-header">
            <h3>Focus sur les alertes</h3>
            <p className="muted">Heures critiques</p>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alerts.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={formatTimeLabel} />
                <YAxis />
                <Tooltip
                  formatter={(value) => `${value} kWh`}
                  labelFormatter={(value) => formatFullDate(value)}
                />
                <Legend />
                <Bar dataKey="consumption" name="Consommation" fill="#ff6b6b" />
                <Bar dataKey="production" name="Production" fill="#ffa600" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card alerts-card">
        <div className="card-header">
          <h3>Notifications et alertes</h3>
          <p className="muted">Détection automatique des seuils</p>
        </div>
        <div className="alerts-list">
          {alerts.length === 0 ? (
            <p className="muted">Aucune alerte sur la période.</p>
          ) : (
            alerts.map((alert) => (
              <div className="alert-item" key={alert.timestamp}>
                <div>
                  <p className="alert-title">{formatFullDate(alert.timestamp)}</p>
                  <p className="muted">
                    Consommation {alert.consumption} kWh / Production{' '}
                    {alert.production} kWh
                  </p>
                </div>
                <span className="badge">
                  {alert.consumption >= thresholds.consumptionHigh
                    ? 'Dépassement consommation'
                    : 'Production faible'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default Dashboard
