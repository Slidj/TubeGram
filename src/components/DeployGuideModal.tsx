import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Bot, Github, Sparkles, ShieldCheck } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface DeployGuideModalProps {
  onClose: () => void;
}

export const DeployGuideModal: React.FC<DeployGuideModalProps> = ({ onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    triggerHaptic('success');
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: 'Крок 1. Заливка на GitHub та автозбірка',
      description: 'Створіть репозиторій на GitHub і додайте GitHub Actions для збірки Vite додатка:',
      code: `# .github/workflows/deploy.yml
name: Deploy Telegram Mini App
on:
  push:
    branches: [ main ]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist`
    },
    {
      title: 'Крок 2. Реєстрація Mini App у @BotFather',
      description: 'Відкрийте бота @BotFather у Telegram і виконайте наступні кроки:',
      code: `/newapp
1. Оберіть вашого Telegram-бота
2. Вкажіть назву додатку (наприклад: "TubeGram ZeroAds")
3. Введіть короткий опис: "YouTube без реклами та зі SponsorBlock"
4. Завантажте аватарку (640x360 px)
5. Вкажіть URL вашого сайту на GitHub Pages (наприклад: https://yourusername.github.io/tubegram)
6. Вкажіть короткий нікнейм додатку (наприклад: "app")`
    },
    {
      title: 'Крок 3. Додавання кнопки відкриття в чаті',
      description: 'У @BotFather налаштуйте кнопку меню (Menu Button), щоб додаток відкривався в 1 клік:',
      code: `/setmenubutton
Оберіть бота -> Надішліть URL вашого Mini App на GitHub Pages -> Вкажіть текст: "▶️ Дивитися YouTube"`
    },
    {
      title: 'Крок 4. Як працює відсутність реклами в цьому додатку',
      description: 'Повне блокування офіційної реклами та спонсорів:',
      code: `1. Офіційна реклама YouTube:
   Повністю відсутня, оскільки додаток завантажує прямі потоки (audio/video streams),
   а не офіційний веб-плеєр із рекламними скриптами DoubleClick/AdSense.

2. Спонсорська реклама авторів:
   Обрізається автоматично через відкрите SponsorBlock API (як у SmartTube).
   Таймкоди перевіряються в реальному часі, і плеєр миттєво перестрибує рекламу!`
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[88vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Інструкція: GitHub + Telegram Mini App</h3>
              <p className="text-[11px] text-slate-400">Повний гайд із запуску власного бота</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {steps.map((s, idx) => (
            <div key={idx} className="p-3.5 bg-slate-900/70 border border-slate-800/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  {s.title}
                </h4>
                <button
                  onClick={() => handleCopy(s.code, idx)}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono transition-colors active:scale-95"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Скопійовано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Копіювати</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-slate-400 text-[11px]">{s.description}</p>

              <pre className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
                {s.code}
              </pre>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl text-xs active:scale-95 transition-all"
          >
            Зрозуміло, закрити
          </button>
        </div>
      </div>
    </div>
  );
};
