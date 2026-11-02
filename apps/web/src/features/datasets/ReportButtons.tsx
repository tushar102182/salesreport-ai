import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileDown } from 'lucide-react';
import { downloadFile } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { useToast } from '../../lib/toast';
import { Button } from '../../components/ui';

/** Downloads a server-rendered PDF in English or Bangla. */
export function PdfButtons({ path, fileBase, size = 'md' }: { path: string; fileBase: string; size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [busy, setBusy] = useState<'en' | 'bn' | null>(null);
  const download = async (lang: 'en' | 'bn') => {
    setBusy(lang);
    try {
      await downloadFile(path, `${fileBase}-${lang}.pdf`, { lang });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button size={size} onClick={() => void download('en')} loading={busy === 'en'}>
        {busy !== 'en' && <FileDown className="size-4" />} {t('report.english')}
      </Button>
      <Button size={size} variant="secondary" onClick={() => void download('bn')} loading={busy === 'bn'}>
        {busy !== 'bn' && <FileDown className="size-4" />} {t('report.bangla')}
      </Button>
    </div>
  );
}
