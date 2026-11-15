// Extends app.json with secrets read from the environment at build time.
// Locally they come from .env (loaded by the Expo CLI); on EAS they come from
// project environment variables (`eas env:create`).
const androidMapsKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
const iosMapsKey = process.env.GOOGLE_MAPS_IOS_KEY;

if (!androidMapsKey) {
  console.warn(
    '[app.config] GOOGLE_MAPS_ANDROID_KEY is not set: native builds will show a blank map.'
  );
}

module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: iosMapsKey,
    },
  },
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: androidMapsKey },
    },
  },
  extra: {
    ...config.extra,
    // Read at runtime by src/components/Mapa.jsx to show a placeholder instead of a blank map.
    mapsEnabled: Boolean(androidMapsKey),
  },
});
