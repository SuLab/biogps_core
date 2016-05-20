'use strict';

// Declare app level module which depends on views, and components
angular.module('biogps', [
  'ngRoute',
  'biogps.version'
]).
config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.when('/api/', {
        templateUrl: 'html/plugin.html'
    }).otherwise({redirectTo: '/view1'});
    $locationProvider.html5Mode(true);
}]);
