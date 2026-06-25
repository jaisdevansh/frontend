const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets'
      );
      
      // Create assets directory if it doesn't exist
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      
      // Write the adi-registration.properties file
      const filePath = path.join(assetsDir, 'adi-registration.properties');
      fs.writeFileSync(filePath, 'DRO52HIDKN2PYAAAAAAAAAAAAA\n');
      
      return config;
    },
  ]);
};
