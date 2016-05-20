'use strict';

angular.module('biogps.version', [
  'biogps.version.interpolate-filter',
  'biogps.version.version-directive'
])

.value('version', '0.1');
