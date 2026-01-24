import { useState } from 'react'
import { api } from '../services/api.js'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/login', { username, password })
      onLogin(response.data)
    } catch (err) {
      setError('Identifiants invalides ou serveur indisponible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page login-page">
      <div className="card login-card">
        <div className="login-header">
          <p className="eyebrow">Supervision énergétique</p>
          <h1>Connexion</h1>
          <p className="muted">
            Accédez au tableau de bord et suivez la consommation en temps réel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Identifiant</span>
            <input
              type="text"
              placeholder="ex. analyste.edf"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="helper">
          <p>
            <strong>Astuce :</strong> utilisez n'importe quels identifiants pour
            accéder à la démo.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
