import { useTheme } from '../../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="px-1 bg-slate-800 dark:bg-gray-500 rounded"
    >
      {theme === 'light' ? '\u{1F319}\uFE0E' : '\u2600\uFE0E'}
    </button>
  );
};

export default ThemeToggle;
