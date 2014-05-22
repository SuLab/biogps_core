steal.plugins('jquery/controller').then(function($){

/**
 * @core
 * @class jQuery.Tie
 * 
 * The $.fn.tie plugin binds form elements and controllers with 
 * models and vice versa.  The result is that a change in 
 * a model will automatically update the form element or controller
 * AND a change event on the element will update the model.
 * 
 * 
 * 
 * 
 * 
 */
$.Controller.extend("jQuery.Tie",{
	init : function(el, inst, attr, type){
		// if there's a controller
		if(!type){
			//find the first one that implements val
			var controllers = this.element.data("controllers") || {};
			for(var name in controllers){
				var controller = controllers[name];
				if(typeof controller.val == 'function'){
					type = name;
					break;
				}
			}
		}
		
		this.type = type;
		this.attr = attr;
		this.inst = inst;
		this.bind(inst, attr, "attrChanged");
		
		//destroy this controller if the model instance is destroyed
		this.bind(inst, "destroyed", "destroy");
		
		var value = inst.attr(attr);
		//set the value
		this.lastValue = value;
		if(type){
			
			//destroy this controller if the controller is destroyed
			this.bind(this.element.data("controllers")[type],"destroyed","destroy");
			this.element[type]("val",value);
			
		}else{
			this.element.val(value)
		}
	},
	attrChanged : function(inst, ev, val){
		if (val !== this.lastValue) {
			this.setVal(val);
			this.lastValue = val;
		}
	},
	setVal : function(val){
		if (this.type) {
			this.element[this.type]("val", val)
		}
		else {
			this.element.val(val)
		}
	},
	change : function(el, ev, val){
		if(!this.type && val === undefined){
			val = this.element.val();
		}
		
		this.inst.attr(this.attr, val, null, this.callback('setBack'))
		
	},
	setBack : function(){
		this.setVal(this.lastValue);
	},
	destroy : function(){
		this.inst = null;
		this._super();
	}
});


});