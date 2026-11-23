const { withAndroidManifest } = require('expo/config-plugins');

const advertisingIdPermission = 'com.google.android.gms.permission.AD_ID';
const portraitFeature = 'android.hardware.screen.portrait';

function withOptionalPortraitFeature(config) {
  return withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest;
    const features = manifest['uses-feature'] ?? [];
    manifest['uses-feature'] = [
      ...features.filter(feature => feature.$['android:name'] !== portraitFeature),
      { $: { 'android:name': portraitFeature, 'android:required': 'false' } },
    ];
    return config;
  });
}

module.exports = ({ config }) => {
  config = withOptionalPortraitFeature(config);
  if (process.env.EXPO_PUBLIC_ADS_ENABLED !== 'false') return config;

  return {
    ...config,
    android: {
      ...config.android,
      blockedPermissions: [
        ...(config.android?.blockedPermissions ?? []),
        advertisingIdPermission,
      ],
    },
    plugins: config.plugins.map(plugin => {
      if (!Array.isArray(plugin)) return plugin;

      const [name, options] = plugin;
      if (name === 'react-native-google-mobile-ads') {
        const pausedOptions = { ...options, delayAppMeasurementInit: true };
        delete pausedOptions.userTrackingUsageDescription;
        return [name, pausedOptions];
      }
      if (name === 'expo-tracking-transparency') {
        return [name, { ...options, userTrackingPermission: false }];
      }
      return plugin;
    }),
  };
};
