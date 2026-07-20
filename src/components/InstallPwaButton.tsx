import { useInstallPrompt } from '../pwa/useInstallPrompt';
import './installPwaButton.css';

export default function InstallPwaButton({ compact = false }: { compact?: boolean }) {
  const { canInstall, promptInstall, isIOS, isStandalone } = useInstallPrompt();
  const icon = `${import.meta.env.BASE_URL}icons/knight-medallion.svg`;

  if (isStandalone) return compact ? null : <span className="install-pwa install-pwa--fallback">100 % gratuit ✨</span>;

  if (isIOS) {
    if (compact) return null;
    return (
      <div className="install-pwa install-pwa--ios">
        <img src={icon} alt="" className="install-pwa-icon" />
        <span>Ajoute l'app : <strong>Partager</strong> → <strong>Sur l'écran d'accueil</strong></span>
      </div>
    );
  }

  if (canInstall) {
    return (
      <button type="button" className={`install-pwa ${compact ? 'install-pwa--compact' : ''}`} onClick={promptInstall}>
        <img src={icon} alt="" className="install-pwa-icon" />
        <span>Installer{compact ? '' : " l'app"}</span>
      </button>
    );
  }

  return compact ? null : <span className="install-pwa install-pwa--fallback">100 % gratuit ✨</span>;
}
