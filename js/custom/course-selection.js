function clone(settings){
    return $.extend({}, settings);
}

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
    var _length = 0;
    var _id;

    function init( id ){
        _id = id;
        list = $("select, #"+id);
        list.selecter();
        hide_empty_list()
    }

    function get_item(value){
        return list.find('option[value="'+ value +'"]');
    }

    function remove_item(value){
        var item = get_item(value);
        if (item.length > 0) {
            _length -= item.length;
            item.remove();
        }
        list.selecter('refresh');
        hide_empty_list()
    }

    function add_item(value, allow_duplicate){
        var item = get_item(value);
        if (!item.length || allow_duplicate){
            list.append('<option value="' + value + '">'+value+'</option>');
            _length++;
        }
        list.selecter('refresh');
        hide_empty_list()
    }

    function get_length(){
        return _length;
    }

    function hide(to_hide){
        if (to_hide){
            $(".selecter, #"+_id).parent().parent().addClass("invisible");
        } else {
            $(".selecter, #"+_id).parent().parent().removeClass("invisible");
        }
    }

    function hide_empty_list(){
        hide(!_length);
    }

    return {
        init:init,
        add_item:add_item,
        remove_item: remove_item,
        get_length: get_length
    }
})();

var course_list = ["CS145","CS135","CS245","MATH145","MATH135"];

var courses= (function(){
    var input;

    function has_error(){
        input.parent().removeClass("has-success");
        input.parent().addClass("has-error");
    }

    function has_success(){
        input.parent().removeClass("has-error");
        input.parent().addClass("has-success");
    }

    function neutralize(){
        input.parent().removeClass("has-success has-error");
    }

    function is_valid(){
        return input.parent().hasClass("has-success");
    }

    function select(){
        has_success();
    }

    function check_suggestion(){
        var length = $('.tt-suggestion').length;
        if (length === 0){
            console.log("no suggestion");
            has_error();
        } else if (length === 1){
            has_success();
        }
    }

    function init(){
        console.log("courses init called");

        var countries = new Bloodhound({
            datumTokenizer: function(d) { return Bloodhound.tokenizers.whitespace(d.name); },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            limit: 3,
            local: [
                { name: 'CS 245' },
                { name: 'CS  246' },
                { name: 'CS 145'},
                { name: 'MATH 135'},
                { name: 'MATH 136'},
            ]
        });

        countries.initialize();
        input = $("#courses");
        input.typeahead({
          hint: true,
          highlight: true,
          autoselect: true,
          minLength: 1
        }, {
          displayKey: 'name',
          source: countries.ttAdapter()
        }).on('typeahead:selected typeahead:autocompleted', select)
          .on('input', check_suggestion);

        input.on('keypress', function (e) {

            if (e.which === 13) {
                e.preventDefault();
                if (is_valid()){
                    clear_input();
                }
            }
        });
    }

    function clear_input(){
        select_obj.add_item(input.val());
        neutralize();
        input.val("").trigger("input keypress");
    }

    return {
        init:init,
        clear_input:clear_input
    }
})();

var calendar = (function(){
    var defaults = {
        defaultView: 'agendaWeek',
        header: {
            left: '',
            center: 'title',
            right: ''
        },
        titleFormat: '[UW Course Schedule]',
        weekends: false,
        editable: true,
        allDaySlot: false,
        eventDurationEditable: false,
        height: "auto",
        minTime: "08:00:00",
        maxTime: "24:00:00",
        columnFormat: {
            week: 'ddd',
        }
    };
    var cls;
    var settings;
    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();
    var count = 3;

    function init(event_config){
        var settings = clone(defaults);
        if (event_config){
            settings["events"] = event_config;
        };
        cls = $('#calendar');
        settings["eventDragStart"] = eventDragStart;
        settings["eventDragStop"] = eventDragStop;
        cls.fullCalendar(settings);
    }

    function eventDragStart(){
        console.log("drag");
        var eventData = {
            title: 'Event',
            start: new Date(y, m, d, 15),
            description: 'long description',
            color: "#00FF00",
            textColor: "#000000",
            holiday: true,
            id: 0
        }
        cls.fullCalendar('renderEvent', eventData, false);
    }

    function eventDragStop(event, jsEvent, ui, view){
        var eventData = {
            title: "new Event",
            start: new Date(y,m,d+1,16),
            id: ++count,
            myData: {course_catlog : 123}
        };
        removeEvents([event.id]);
        removePlaceholderEvents();
        cls.fullCalendar("renderEvent", eventData, true);
    }

    function removeEvents(ids){
        cls.fullCalendar('removeEvents', ids);
    }

    function removePlaceholderEvents(extra_ids){
        var arr = [0];
        if (extra_ids){
            arr.concat(extra_ids);
        }
        removeEvents(arr);
    }
    return {
        init:init,
        removeEvents:removeEvents,
        removePlaceholderEvents:removePlaceholderEvents
    }
})();

function on_form_submmit(){
   if (e.preventDefault) e.preventDefault();
   console.log("form submitted");
    /* do what you want with the form */
    asd;
    // You must return false to prevent the default form behavior
    return false;
}

var init = function(){
    console.log("course-selection.init called");

    select_obj.init("course_list");
    //validation();

    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();


    var events = [
        {
            title: 'Event',
            start: new Date(y, m, d, 10),
            description: 'long description',
            id: 1
        },
        {
            title: 'background',
            start: new Date(y, m, d, 11),
            end: new Date(y, m, d, 14),
            description: 'long description',
            id: 0,
            color: "#00FF00",
            textColor: "#000000",
            holiday: true,
        }];
    calendar.init(events);
    calendar.removePlaceholderEvents(); //cleanup
    courses.init();







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

