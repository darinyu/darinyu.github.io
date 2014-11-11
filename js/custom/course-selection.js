var uw_api = (function () {
    var uw_api_key = '7169a9c78a8a6c0f2885854562b114c4';
    var uw_api_url = 'https://api.uwaterloo.ca/v2/';

    var response_code = {
        200: {is_valid: true,  message:"Request successful"},
        204: {is_valid: false, message:"No data returned"},
        401: {is_valid: false, message:"Invalid API key"},
        403: {is_valid: false, message:"The provided API key has been banned"},
        429: {is_valid: false, message:"API request limit reached"},
        501: {is_valid: false, message:"Invalid method"},
        511: {is_valid: false, message:"API key is required (?key=)"}
    };


    var getCourseInfo = function(course_name, catalog_number){
        var url = uw_api_url + "courses/" + course_name + "/" + catalog_number + ".json";
        var response_data;
        $.get( url, { key: uw_api_key })
            .done(function( data ) {
                response_data = data;
            });
        return response_data;
    }

    var isSuccessfulReponse = function( response ){
        return true;
        return response_code[ response.meta.status ].is_valid; //todo
    }

    return {
        isSuccessfulReponse: isSuccessfulReponse,
        getCourseInfo: getCourseInfo
    }
}());

//course_list
var select_obj = (function(){
    var list;

    function init( id ){
        list = $("select, #"+id);
        console.log(list);
        list.selecter();
    }

    function get_item(value){
        return list.find('option[value="'+ value +'"]');
    }

    function remove_item(value){
        var item = get_item(value);
        if (item.length > 0) {
            item.remove();
        }
        list.selecter('refresh');
    }

    function add_item(value, allow_duplicate){
        var item = get_item(value);
        if (!item.length || allow_duplicate){
            list.append('<option value="' + value + '">'+value+'</option>');
        }
        list.selecter('refresh');
    }

    return {
        init:init,
        add_item:add_item,
        remove_item: remove_item
    }
})();

function validation(){
    console.log("validation");

    $.fn.bootstrapValidator.validators.course_name_validator = {
        validate: function(validator, $field, options) {
            var value = $field.val();
            var response = uw_api.getCourseInfo("CS", "245");
            console.log(response);
            return uw_api.isSuccessfulReponse(response);
        }
    };

    var bv = $('#profileForm').bootstrapValidator({
        feedbackIcons: {
            valid: 'glyphicon glyphicon-ok',
            invalid: 'glyphicon glyphicon-remove',
            validating: 'glyphicon glyphicon-refresh'
        },
        fields: {
            courses: {
                trigger: 'blur',
                validators: {
                    notEmpty: {
                        message: 'Course name is required'
                    },
                    course_name_validator:{
                        message: 'yeah, you get it wrong'
                    }
                },
                onSuccess: function(e, data) {
                    var value = $("[name=courses]").val();
                    console.log("here it is: " + value);
                    select_obj.add_item(value);
                    console.log("passed!");
                },
                onError: function(e, data) {
                    data.bv.updateMessage("courses", "course_name_validator", "Did you mean CS145?");
                    console.log("not found!");
                },
            }
        }
    });

    $('[name="courses"]').on('keypress', function (e) {
        if (e.which === 13) {
            e.preventDefault();
            bv.data('bootstrapValidator').revalidateField("courses");
        }
    });
}

var init = function(){
    console.log("course-selection.init called");

    var obj = $('.playground.constrain-to-parent .pep');
    var snap_freq = 0.4;
    var height = Math.ceil(obj.height() * snap_freq);
    var width = Math.ceil(obj.width() * snap_freq);
    console.log(width);
    select_obj.init("course_list");
    select_obj.add_item("CS245");
    select_obj.remove_item("2");

    $("#course_item").keyup(function(event){
        if(event.keyCode == 13){

        }
    });
    validation();

    //console.log($("select"));
    //$("select").selecter();

   /* obj.pep({
        grid: [width,height],
        useCSSTranslation: false,
        constrainTo: 'parent'
    });

    var course_set = [];
    var mylist = {
        view:"list",
        template:"#title#",
        height: 300,
        select:"multiselect",
        id: "course_list",
        data:course_set
    };
    var search_type_complete = function(e){
        var value = this.getValue().toLowerCase();
    }

    var onSearchClicked = function(e){
        console.log("ha");
        var value = this.getValue().toLowerCase();
        this.getParentView().validate(); //form.validate()
        $$("course_list").add({
            id:value,  //adding  an item with two properties
            title:value
        });
    }

    var always_false = function(){
        return false;
    }
     var course_combo =             {
                view:"combo", id:"combo1", width:400,label: 'Custom template & filter',  name:"fruit1",
                value:1, options:{
                filter:function(item, value){
                    if(item.name.toString().toLowerCase().indexOf(value.toLowerCase())===0)
                        return true;
                    return false;
                },
                body:{
                    template:"#name#",
                    yCount:3,
                    data:[
                        { id:1, name:"Banana"},
                        { id:2, name:"Papai"},
                        { id:3, name:"Apple"},
                        { id:4, name:"Mango"}
                    ]
                }
            }};

    var form1 = [
        { view:"search", placeholder :'CS245', label:"Course ID"
          , reqiored: true, name:"search_field", on:{
             'onTimedKeyPress'   : search_type_complete,
             'onSearchIconClick' : onSearchClicked
          }
        },
        course_combo
    ];
    webix.ui({
        container:"course_data",
        margin:30, cols:[
            { margin:5, rows:[
                { view:"form",
                  scroll:false,
                  width:400,
                  elements: form1,
                  rules:{
                    search_field:function(value){ return false }
                  }
                },

                mylist,
            ]}
        ]
    });
*/
};

