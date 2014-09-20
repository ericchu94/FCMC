var app = angular.module( 'hackthenorth', [
  'ngRoute'
]);

app.config( function myAppConfig ($routeProvider, $locationProvider) {
<<<<<<< HEAD
  $routeProvider
  .when('/', {
    templateUrl: 'views/home.html',
    controller: 'HomeCtrl'
  }).when('/start', {
    templateUrl: 'views/start.html',
    controller: 'GameCtrl'
  }).otherwise('/', {
    templateUrl: 'views/home.html',
    controller: 'HomeCtrl'
  });

  $locationProvider.html5Mode(true);
});

app.run( function run () {
});

app.controller( 'AppCtrl', function AppCtrl ( $scope, $location, socket ) {
  $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    if ( angular.isDefined( toState.data.pageTitle ) ) {
      $scope.pageTitle = toState.data.pageTitle + ' | FCMC' ;
    }
  });
});
