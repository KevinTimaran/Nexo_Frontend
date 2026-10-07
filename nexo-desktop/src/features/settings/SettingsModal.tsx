import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sun,
  Moon,
  Monitor,
  Globe,
  Bell,
  Volume2,
  Eye,
  LogOut,
  User as UserIcon,
  Check,
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { useTheme } from "../../app/providers/ThemeProvider";
import { currentLanguage, setLanguage } from "../../i18n";
import { useAuth } from "../../context/AuthContext";
import type { Language, ThemeMode } from "../../domain/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const lang = currentLanguage();

  const [reduceMotion, setReduceMotion] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);

  if (!isOpen) return null;

  const handleLangChange = (newLang: Language) => {
    void setLanguage(newLang);
  };

  const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: "light", label: t("settings.themes.light"), icon: <Sun className="w-4 h-4 text-amber-500" /> },
    { mode: "dark", label: t("settings.themes.dark"), icon: <Moon className="w-4 h-4 text-concept-fg" /> },
    { mode: "system", label: t("settings.themes.system"), icon: <Monitor className="w-4 h-4 text-muted" /> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("settings.title")}
      maxWidth="lg"
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
        {/* Appearance Section */}
        <div>
          <h4 className="text-body font-bold text-fg mb-1">{t("settings.appearance")}</h4>
          <p className="text-caption text-muted mb-3">{t("settings.themeDescription")}</p>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => (
              <button
                key={opt.mode}
                onClick={() => setTheme(opt.mode)}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-2 text-caption font-medium transition-all ${
                  theme === opt.mode
                    ? "bg-concept-fg/10 border-concept-fg text-concept-fg shadow-sm"
                    : "bg-elevated border-line text-muted hover:text-fg hover:bg-hover"
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language Section */}
        <div>
          <h4 className="text-body font-bold text-fg mb-1">{t("settings.language")}</h4>
          <p className="text-caption text-muted mb-3">{t("settings.languageDescription")}</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleLangChange("en")}
              className={`p-3 rounded-2xl border flex items-center justify-between text-caption font-medium transition-all ${
                lang === "en"
                  ? "bg-concept-fg/10 border-concept-fg text-concept-fg shadow-sm"
                  : "bg-elevated border-line text-muted hover:text-fg hover:bg-hover"
              }`}
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                English
              </span>
              {lang === "en" && <Check className="w-4 h-4 text-concept-fg" />}
            </button>

            <button
              onClick={() => handleLangChange("es")}
              className={`p-3 rounded-2xl border flex items-center justify-between text-caption font-medium transition-all ${
                lang === "es"
                  ? "bg-concept-fg/10 border-concept-fg text-concept-fg shadow-sm"
                  : "bg-elevated border-line text-muted hover:text-fg hover:bg-hover"
              }`}
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Español
              </span>
              {lang === "es" && <Check className="w-4 h-4 text-concept-fg" />}
            </button>
          </div>
        </div>

        {/* Interface Preferences */}
        <div className="space-y-3 pt-3 border-t border-line-soft">
          <h4 className="text-body font-bold text-fg">{t("settings.interface")}</h4>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-elevated/60 border border-line-soft">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-muted" />
              <div>
                <p className="text-caption font-semibold text-fg">{t("settings.reduceMotion")}</p>
                <p className="text-[11px] text-muted">{t("settings.reduceMotionDescription")}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
              className="w-4 h-4 rounded border-line text-concept-fg focus:ring-concept-fg cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-elevated/60 border border-line-soft">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-muted" />
              <div>
                <p className="text-caption font-semibold text-fg">{t("settings.desktopNotifications")}</p>
                <p className="text-[11px] text-muted">{t("settings.desktopNotificationsDescription")}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-4 h-4 rounded border-line text-concept-fg focus:ring-concept-fg cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-elevated/60 border border-line-soft">
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-muted" />
              <div>
                <p className="text-caption font-semibold text-fg">{t("settings.sound")}</p>
                <p className="text-[11px] text-muted">{t("settings.soundDescription")}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => setSound(e.target.checked)}
              className="w-4 h-4 rounded border-line text-concept-fg focus:ring-concept-fg cursor-pointer"
            />
          </div>
        </div>

        {/* Account Section */}
        {user && (
          <div className="pt-3 border-t border-line-soft space-y-3">
            <h4 className="text-body font-bold text-fg">{t("settings.account")}</h4>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-elevated border border-line">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-concept-fg/10 text-concept-fg flex items-center justify-center font-bold">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-body font-bold text-fg truncate">{user.name}</p>
                  <p className="text-caption text-muted truncate">{user.email}</p>
                </div>
              </div>

              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onClose();
                  void signOut();
                }}
                icon={<LogOut className="w-3.5 h-3.5" />}
              >
                {t("settings.signOut")}
              </Button>
            </div>
          </div>
        )}

        {/* Footer Version Info */}
        <div className="text-center pt-2 text-[11px] font-mono text-muted">
          {t("settings.version", { version: "1.0.0" })}
        </div>
      </div>
    </Modal>
  );
};
