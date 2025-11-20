import { FormEvent, useState } from 'react';

type LoginPageProps = {
  onLogin: (name: string) => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const userOk = user.trim().toLowerCase() === 'victoria'.toLowerCase();
    const passOk = password === 'Victoria10';

    if (!userOk || !passOk) {
      setError('Usuário ou senha incorretos.');
      setPassword('');
      return;
    }

    setError('');
    onLogin('Victoria');
  }

  return (
    <div className="login-page">
      <div className={`login-card ${error ? 'login-card-error' : ''}`}>
        <div className="login-logo">
          <img
            src="/logo-victoria-freitas.jpg"
            alt="Studio Victoria Freitas"
            className="login-logo-img"
          />
        </div>

        <div className="login-title">Sistema de Agendamentos</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                className="form-input"
                placeholder="Digite seu usuário"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                className="form-input"
                placeholder="Digite sua senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button type="submit" className="login-button">
            Entrar no Sistema
          </button>
        </form>
      </div>
    </div>
  );
}
