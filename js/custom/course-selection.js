function clone(settings){
    return $.extend({}, settings);
}

function format(obj){
    return JSON.stringify(obj, null, "\t");
}

function start_with(str, sub){
    return str.indexOf(sub) === 0;
}

function random_number(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}

function merge_options(obj1,obj2){
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}

var uw_api = (function () {
    var uw_api_key = '7169a9c78a8a6c0f2885854562b114c4';
    var uw_api_url = 'https://api.uwaterloo.ca/v2/';
    var last_request_successful = true;

    var response_code = {
        200: {is_valid: true,  message:"Request successful"},
        204: {is_valid: false, message:"No data returned"},
        401: {is_valid: false, message:"Invalid API key"},
        403: {is_valid: false, message:"The provided API key has been banned"},
        429: {is_valid: false, message:"API request limit reached"},
        501: {is_valid: false, message:"Invalid method"},
        511: {is_valid: false, message:"API key is required (?key=)"}
    };


    var getCourseInfo = function(subject, catalog_number, cb){
        var url = uw_api_url + "courses/" + subject + "/" + catalog_number + ".json";
        $.get( url, { key: uw_api_key })
            .done(function( data ) {
                cb(data);
                last_request_successful = isSuccessfulReponse(data);
                return data;
            });
    }

    var getCourseSchedule = function(subject, catalog_number, cb){
        var url = uw_api_url + "courses/" + subject + "/" + catalog_number + "/schedule.json";
        $.get( url, { key: uw_api_key })
            .done(function( data ) {
                cb(data);
                last_request_successful = isSuccessfulReponse(data);
                return data;
            });
    }

    var isLastRequestSeccessful = function(){
        return last_request_successful;
    }

    var isSuccessfulReponse = function( response ){
        return true;
        return response_code[ response.meta.status ].is_valid; //todo
    }

    return {
        isSuccessfulReponse: isSuccessfulReponse,
        isLastRequestSeccessful: isLastRequestSeccessful,
        getCourseInfo: getCourseInfo,
        getCourseSchedule: getCourseSchedule
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
            datumTokenizer: function(d) {
                var temp_list = Bloodhound.tokenizers.whitespace(d.name);
                var str = temp_list[0] + temp_list[1]; // CS + 245
                temp_list.push(str);
                return temp_list;
            },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            limit: 3,
            local: [
                { name: 'CS 245' },
                { name: 'CS 246' },
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
        slotDuration: '00:20:00',
        titleFormat: '[UW Course Schedule]',
        weekends: false,
        editable: true,
        allDaySlot: false,
        eventDurationEditable: false,
        height: "auto",
        minTime: "08:00:00",
        maxTime: "24:00:00",
        columnFormat: { week: 'ddd' },
        axisFormat: 'h(:mm)a'
    };
    var cls;
    var placeholder_background_color = "#C7C7C7";
    var placeholder_text_color = placeholder_background_color;
    var count = 3;
    var date,y,m,d;

    function init(event_config){
        date = moment();
        y = date.year();
        m = date.month();
        d = date.date();
        var settings = clone(defaults);
        if (event_config){
            settings["events"] = event_config;
        };
        cls = $('#calendar');
        settings["eventDragStart"] = eventDragStart;
        settings["eventDrop"] = eventDrop;
        settings["eventRender"] = function(event, element) {
            element.find('.fc-event-title').append("<br/>" + event.description);
        };
        //console.log(JSON.stringify(settings, null, "\t"));
        cls.fullCalendar(settings);
    }

    function snap_to_placeholder(my_event){
        var array = cls.fullCalendar('clientEvents');
        var has_overlap = false;
        var start,end;
        //event_obj from drag is in diff timezone, hence need offset
        var start_this =  moment(my_event.start).add(5,'hours');
        var end_this = moment(my_event.end).add(5, 'hours');

        var overlap_threshold = 30; //mins
        $.each(array, function(index, comp_event){
            if (has_overlap) return;
            if(comp_event.id != event.id && comp_event.placeholder){
                var end_comp = moment(comp_event.end);
                var start_comp = moment(comp_event.start);
                if (!( (start_this.add(overlap_threshold, 'mins') >= end_comp) ||
                       (start_comp.add(overlap_threshold, 'mins') >= end_this) )){
                    has_overlap = true;
                    start = start_comp;
                    end = end_comp;
                }
            }
        });
        console.log("has_overlap: " + has_overlap);
        return {
            has_overlap:has_overlap,
            start:start,
            end:end
        }
    }

    function addEvent( event_data, isHoliday ){
        //console.log("addEvent");
        //console.log("1. " + JSON.stringify(event_data));
        event_data["id"] = ++count;
        if (isHoliday){
            event_data["color"] = placeholder_background_color;
            event_data["textColor"] = placeholder_text_color;
            event_data["placeholder"] = true;
        }
        //console.log("2. " +JSON.stringify(event_data));
        cls.fullCalendar('renderEvent', event_data, true);
    }

    function eventDragStart(){
        console.log("drag");
        var num = random_number(8,20);
        var d_off = 0;
        var event_data = {
            title: 'Event',
            start: moment({y:y, M:m, d:d+d_off, h:num}),
            end: moment({y:y, M:m, d:d+d_off, h:num+2}),
            description: 'long description',
            color: placeholder_background_color,
            textColor: placeholder_text_color,
            placeholder: true,
            id: 0
        }
        renderEvents(event_data);
    }

    function eventDrop(event, delta, revertFunc){
        var snap_info = snap_to_placeholder(event);

        if (!snap_info["has_overlap"]){
            revertFunc();
        } else {
            removeEvents([event.id]);
            var event_data = {
                title: "new Event",
                start: snap_info.start,
                end: snap_info.end,
                backgroundColor: event.backgroundColor,
                id: event.id,
            };
            renderEvents(event_data);
        }
        removePlaceholderEvents();
    }

    function removeEvents(ids){
        cls.fullCalendar('removeEvents', ids);
    }

    function renderEvents(event_data, isStick){
        cls.fullCalendar("renderEvent", event_data, isStick);
    }

    function rerenderEvents(){
        console.log("ha?");
        cls.fullCalendar( 'rerenderEvents' );
    }

    function refresh(){
        removeEvents();
    }

    function removePlaceholderEvents(extra_ids){
        var arr = [0];
        if (extra_ids){
            arr.concat(extra_ids);
        }
        removeEvents(arr);
    }

    function processScheduleResponse(response){
        function get_course_time_info(class_info){
            //get weekday
            var weekday_string = ["M","T","W","Th","F"];
            var weekday_list=[];
            var weekdays_str = class_info["weekdays"];
            //console.log("start get course time");
            //console.log("weekdays_str: " + weekdays_str);
            for (var i=0; i<weekday_string.length; i++){
                if (weekdays_str.indexOf(weekday_string[i]) === 0){
                    if (weekday_string[i] === "T" && (weekdays_str.indexOf("Th") ===0)){
                        continue;
                    }
                    weekday_list.push(i+1);
                    weekdays_str = weekdays_str.substr(weekday_string[i].length);
                }
            }

            //start_time, end_time
            var start_h = class_info["start_time"].split(":")[0];
            var start_m = class_info["start_time"].split(":")[1];
            var end_h = class_info["end_time"].split(":")[0];
            var end_m = class_info["end_time"].split(":")[1];

            var fix = date.weekday();
            var class_list = [];
            for (var i=0; i<weekday_list.length; i++){
                var offset = weekday_list[i] - fix;
                class_list.push({
                    start: moment({y:y,M:m,d:d+offset,h:start_h,m:start_m}),
                    end: moment({y:y,M:m,d:d+offset,h:end_h,m:end_m})
                })
            }

            return class_list;
        }

        //TODO check response;
        var data = response["data"];
        var events = [];
        var has_lec = false;
        var has_tut = false;
        $.each(data, function(index, obj){
            var date = obj["classes"][0]["date"];
            var is_lec = start_with(obj["section"],"LEC");
            if ((is_lec && has_lec) || (!is_lec && has_tut)){
                return; //only needs one
            }
            var class_info = {
                start_time: date["start_time"],
                end_time: date["end_time"],
                weekdays: date["weekdays"]
            }
            var my_list = get_course_time_info(class_info);
            var id = obj["subject"] + obj["catalog_number"] + obj["section"].substr(0,3);
            var color_str = color.next_color();
            $.each(my_list, function(index, time_info){
                var event_data = {
                    //data : data,
                    "title": obj["title"] + " - " + obj["section"],
                    id : id,
                    start: time_info["start"],
                    end: time_info["end"],
                    backgroundColor: color_str,
                    borderColor: color_str
                }
                events.push(event_data);
            });
            has_lec = has_lec || is_lec;
            has_tut = has_tut || !is_lec;
        });
        cls.fullCalendar( 'addEventSource', events )
    }

    return {
        init:init,
        removeEvents:removeEvents,
        refresh:refresh,
        removePlaceholderEvents:removePlaceholderEvents,
        addEvent:addEvent,
        processScheduleResponse:processScheduleResponse
    }
})();

var color = (function(){
    unselected = ["#57246B","#246B69","#6B4024","#1F4918","#BF4840","#6E74CF","#B83D91","#33993A","#309166","#283A77","#413091","#A9A2D7","#BABA5E","#2F5E6F","#3DECF5","#4309AE","#E8E12C","#7186EF","#6FF542","#09AA77","#13AA98","#F35912"]
    selected = [];

    function next_color(){
        var color_str = unselected[random_number(0,unselected.length-1)];
        selected.push[color_str];
        var index = unselected.indexOf(color_str);
        unselected.splice(index, 1);
        return color_str;
    }

    function clear(){
        unselected.concat(selected);
        selected = [];
    }

    return {
        next_color:next_color,
        clear:clear
    }
})();

var init = function(){
    console.log("course-selection.init called");
    $("#my_form").submit(on_form_submmit);

    select_obj.init("course_list");

    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();

    var events = [
        {
            title: 'Event',
            start: moment({y:y, M:10, d:d, h:10}),
            end: moment({y:y, M:10, d:d, h:12}),
            description: 'long description',
            id: 1
        },
    ]; //TODO remove

    calendar.init();
    courses.init();
};


function on_form_submmit(e){
    var selected_courses = [];

    function add_courses_to_calendar(){
        calendar.refresh();
        color.clear();
        selected_courses.forEach(function(entry){
                var arr = entry.split(/\s+/);
                var subject = arr[0];
                var catalog_number = arr[1];
                uw_api.getCourseSchedule(subject, catalog_number, calendar.processScheduleResponse);
        });
    }
    if (e.preventDefault) e.preventDefault();
    console.log("form submitted");

    $('.course_list option:selected').each(function(){
        selected_courses.push(this.getAttribute("value"));
    });
    console.log(selected_courses);
    add_courses_to_calendar();
    return false;
}