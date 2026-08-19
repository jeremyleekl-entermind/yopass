import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCopy } from '@shared/hooks/useCopy';
import {
  generatePassword,
  passwordStrength,
  type PasswordOptions,
} from '@shared/lib/passwordGenerator';

const STRENGTH_CLASSES = [
  'bg-error text-error-content',
  'bg-warning text-warning-content',
  'bg-success text-success-content',
  'bg-success text-success-content',
  'bg-primary text-primary-content',
];

export default function PasswordGenerator() {
  const { t } = useTranslation();
  const { copy, isCopied } = useCopy();
  const copied = isCopied();

  const [options, setOptions] = useState<PasswordOptions>({
    length: 20,
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
    noDuplicates: false,
  });
  const [password, setPassword] = useState('');

  function toggle(key: keyof PasswordOptions) {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function regenerate() {
    setPassword(generatePassword(options));
  }

  const strength = passwordStrength(password.length);
  const strengthKey = [
    'passGen.strengthWeak',
    'passGen.strengthFair',
    'passGen.strengthGood',
    'passGen.strengthStrong',
    'passGen.strengthExcellent',
  ][strength];

  return (
    <div className="card bg-base-100 shadow-sm border border-base-300">
      <div className="card-body p-6 sm:p-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-3xl font-bold">{t('passGen.title')}</h2>
          <a
            href="#/"
            className="btn btn-ghost btn-sm gap-2"
            title={t('passGen.backToSecrets')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            {t('passGen.backToSecrets')}
          </a>
        </div>
        <p className="text-base text-base-content/60 mb-6">
          {t('passGen.subtitle')}
        </p>

        {/* Generated password */}
        <div className="form-control">
          <label className="label" htmlFor="generated-password">
            <span className="label-text font-semibold">
              {t('passGen.generatedLabel')}
            </span>
          </label>
          <div className="flex gap-2">
            <input
              id="generated-password"
              type="text"
              readOnly
              value={password}
              placeholder={t('passGen.emptyHint')}
              onFocus={e => e.currentTarget.select()}
              className="input input-bordered w-full font-mono text-base bg-base-100"
            />
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => password && copy(password)}
              title={t('passGen.buttonCopy')}
            >
              {copied ? t('passGen.copied') : t('passGen.buttonCopy')}
            </button>
          </div>
          {/* Strength meter */}
          {password && (
            <div className="mt-3 flex items-center gap-3">
              <progress
                className="progress progress-primary flex-1"
                value={strength + 1}
                max={5}
              />
              <span
                className={`badge badge-sm font-semibold ${
                  STRENGTH_CLASSES[strength]
                }`}
              >
                {t(strengthKey)}
              </span>
            </div>
          )}
        </div>

        {/* Options */}
        <fieldset className="form-control mt-6">
          <legend className="label-text font-semibold text-base text-balance">
            {t('passGen.lengthLabel')}
          </legend>
          <div className="flex items-center gap-4 mt-2">
            <input
              type="range"
              min={4}
              max={64}
              value={options.length}
              onChange={e =>
                setOptions(prev => ({
                  ...prev,
                  length: Number(e.target.value),
                }))
              }
              className="range range-primary flex-1"
            />
            <span className="text-sm font-semibold tabular-nums w-24 text-right">
              {options.length} {t('passGen.lengthUnit')}
            </span>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {(
            [
              ['lowercase', 'passGen.lowercase'],
              ['uppercase', 'passGen.uppercase'],
              ['numbers', 'passGen.numbers'],
              ['symbols', 'passGen.symbols'],
              ['excludeAmbiguous', 'passGen.excludeAmbiguous'],
              ['noDuplicates', 'passGen.noDuplicates'],
            ] as [keyof PasswordOptions, string][]
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-3 cursor-pointer select-none bg-base-200/50 rounded-lg px-4 py-3 hover:bg-base-200 transition-colors duration-150"
            >
              <input
                type="checkbox"
                checked={Boolean(options[key])}
                onChange={() => toggle(key)}
                className="checkbox checkbox-primary checkbox-sm"
              />
              <span className="text-sm text-base-content/80">{t(label)}</span>
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            className="btn btn-primary flex-1 h-12 text-base font-semibold rounded-lg"
            type="button"
            onClick={regenerate}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            {t('passGen.buttonGenerate')}
          </button>
          {password && (
            <button
              className="btn btn-outline flex-1 h-12 text-base font-semibold rounded-lg"
              type="button"
              onClick={regenerate}
            >
              {t('passGen.buttonRegenerate')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
