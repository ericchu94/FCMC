var app = angular.module( 'hackthenorth', [
  'ngRoute'
]);

app.config( function myAppConfig ($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true);

  $routeProvider.when('/', {
    templateUrl: 'views/partials/home.html',
    controller: 'HomeCtrl'
  }).when('start', {
    templateUrl: 'views/partials/start.html',
    controller: 'HomeCtrl'
  }).otherwise( 'home' );
})

app.run( function run () {
})

app.controller( 'AppCtrl', function AppCtrl ( $scope, $location, socket ) {
  $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    if ( angular.isDefined( toState.data.pageTitle ) ) {
      $scope.pageTitle = toState.data.pageTitle + ' | FCMC' ;
    }
  });
})

;
