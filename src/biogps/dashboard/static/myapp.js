var app = angular.module('myApp', []);
    app.controller("myCtrl", function ($scope, $http) {
    $scope.submitForm = function() {  
        var key = $scope.key;        
        //alert(key)
        $http({
            method:'POST',
            url:'/boe',
            data: {'query' : key},
            //headers:{'Content-Type': 'application/x-www-form-urlencoded'},
            }).success(function(c){
                 alert("adawsd");
            }).error(function(c){

                    alert("adasdasd");

            })
           
            return false;
        }   
    

    $scope.useSampleSearch = function(evt){
        $scope.key = evt;
    }
});
                        
      

 
