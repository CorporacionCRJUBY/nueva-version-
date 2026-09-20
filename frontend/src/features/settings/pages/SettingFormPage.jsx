// FILE: frontend/src/features/settings/pages/SettingFormPage.jsx
import { sx } from '../../../ui/sx';
import { FormSection, PageHeader } from '../../../components/FormKit';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Paper, Alert } from '@mui/material';

const SettingFormPage = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('settings.title')}
        backTo="/settings"
      />

      <FormSection>
        <Alert severity="info">
          {t('settings.useListPage')}
        </Alert>
      </FormSection>
    </div>
  );
};

export default SettingFormPage;