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

function hide_qtip(){
    $('.qtip').each(function(){
        $(this).qtip('hide')
    });
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

    function init(){
        console.log("select_obj init called");
        _id = "course_list";
        list = $("select, #"+_id);
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
        $("span[data-value='"+value+"']").click();

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

    function unselect_list(){
        $("span.selecter-item.selected").click()
    }

    function update(){
        list.selecter("update");
    }

    return {
        init:init,
        add_item:add_item,
        remove_item: remove_item,
        get_length: get_length,
        unselect_list: unselect_list,
        update: update
    }
})();

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
            has_error();
        } else if (length === 1){
            has_success();
        }
    }

    function init(){
        console.log("courses init called");

        var my_courses = new Bloodhound({
            datumTokenizer: function(d) {
                var temp_list = Bloodhound.tokenizers.whitespace(d.name);
                var str = temp_list[0] + temp_list[1]; // CS + 245
                temp_list.push(str);
                return temp_list;
            },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            limit: 5,
            local: course_list
        });

        my_courses.initialize();

        Handlebars.registerHelper('isOnlineCourse', function(block) {
            if (this.offerings.online_only) {
                return block.fn(this);
            } else {
                return block.inverse(this);
            }
        });
        Handlebars.registerHelper('hasOnlineCourse', function(block) {
            if (this.offerings.online) {
                return block.fn(this);
            }
        });

        var suggestion_template = '<div class="label label-info pull-right">' +
                                      '{{#isOnlineCourse}} Online Only {{else}}' +
                                      '{{#hasOnlineCourse}} Has Online {{/hasOnlineCourse}}'+
                                      '{{/isOnlineCourse}}' +
                                  '</div> <div>{{name}}</div> <div style="font-size:14px">{{title}}</div>';
        input = $("#courses");
        input.typeahead({
            hint: true,
            highlight: true,
            autoselect: true,
            minLength: 1
        }, {
            displayKey: 'name',
            source: my_courses.ttAdapter(),
            templates: {
                suggestion: Handlebars.compile( suggestion_template )
            }
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
        slotDuration: '00:30:00',
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
    var event_qtip = {
        content: "", //need content
        position: {
            my: 'bottom left',
            at: 'top right',
            target: 'mouse',
             adjust: {
                 mouse: false
             }
        },
        show: {
            effect: function() {
                $(this).fadeTo(500, 1);
            },
            delay: 500,
            solo:true,
        },
        hide: {
            inactive: 1500,
        },
        style: {
            classes : 'qtip-bootstrap',
        }
    }

    var cls;
    var placeholder_background_color = "#C7C7C7";
    var placeholder_text_color = "#FFFFFF";
    var placeholder_id = 0;
    var count = 3;
    var date,y,m,d;
    var course_data = {};
    var snap_info = {};
    var tooltip_disabled = false;
    var flattened_course_array = [];
    var course_list_length;
    var num_course_responded = 0;

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
        $.extend(settings,{
            eventDragStart : eventDragStart,
            eventDragStop : eventDragStop,
            eventDrop : eventDrop,
            eventClick : eventClick,
            eventRender : eventRender
        });
        cls.fullCalendar(settings);
    }

    function snap_to_placeholder(my_event){
        var array = cls.fullCalendar('clientEvents');
        var has_overlap = false;
        var start,end,id;
        //event_obj from drag is in diff timezone, hence need offset
        var start_this =  moment(my_event.start).add(5,'hours');
        var end_this = moment(my_event.end).add(5, 'hours');

        var overlap_threshold = 20; //mins
        $.each(array, function(index, comp_event){
            if (has_overlap) return;
            if (!comp_event) return;
            if(comp_event.id != my_event.id && comp_event.id === 0){
                var end_comp = moment(comp_event.end);
                var start_comp = moment(comp_event.start);
                if (!( (start_this.add(overlap_threshold, 'mins') >= end_comp) ||
                       (start_comp.add(overlap_threshold, 'mins') >= end_this) )){
                    has_overlap = true;
                    id = comp_event["data"]["original_id"];
                    start = start_comp;
                    end = end_comp;
                }
            }
        });
        //console.log("has_overlap: " + has_overlap);
        return {
            has_overlap:has_overlap,
            id:id,
            start:start,
            end:end
        }
    }

    function addEvent( event_data, isHoliday ){
        event_data["id"] = ++count;
        if (isHoliday){
            event_data["color"] = placeholder_background_color;
            event_data["textColor"] = placeholder_text_color;
            event_data["annotation"] = true;
            //event_data["placeholder"] = true;
        }
        cls.fullCalendar('renderEvent', event_data, true);
    }

    function eventDragStart(event,jsEvent){
        drag_has_overlap = false;
        hide_qtip();
        tooltip_disabled = true;
        //console.log("DragStart");
        var course_type = event.data.type;
        var course_name = event.data.name;
        var id = event.id;
        var my_list = [];
        var this_course = course_data[course_name][course_type];
        for (var i=0; i<this_course.length; i++){
            if (this_course[i][0].id !== id){
                my_list = my_list.concat(this_course[i]);
            }
        }
        var placeholder_events = my_list.map(function(element){
            var ele = clone(element);
            ele["color"] = placeholder_background_color;
            ele["textColor"] = placeholder_text_color;
            ele["placeholder"] = false;
            ele["annotation"] = true;
            ele["data"]["original_id"] = ele["id"];
            ele["id"] = 0;
            return ele;
        })
        renderBatchEvents(placeholder_events);
    }

    function eventDragStop(event){
        tooltip_disabled = false;
        //console.log("dragstop");
    }

    function eventDrop(event, delta, revertFunc, jsEvent){
        //console.log("DragDrop");

        snap_info = snap_to_placeholder(event);

        if (!snap_info["has_overlap"]){
            console.log("revert");
            revertFunc();
        } else {
            removeEvents([event.id]);
            var course_type = event.data.type;
            var course_name = event.data.name;
            var id = snap_info.id;
            var events = course_data[course_name][course_type].filter(function(element){
                return element[0].id === id;
            });
            renderBatchEvents(events[0]);
        }
        removePlaceholderEvents();
    }

    function eventClick(data, event, view) {
        //console.log("eventClicked");
    }


    function eventRender(event, element) {
        function term_desc_pair(term, desc){
            if (!desc){
                return "";
            }
            var format1 = "<dl><dt>"+term+"</dt><dd>"+desc+"</dd></dl>";
            var format2 = "<span><strong>"+term+"</strong>: "+desc+"</span><br>";
            return format2;
        }

        function enrollment_progress(total, cap){
            var percentage = 0;
            if (total >= cap){
                percentage = 100;
            } else {
                percentage = Math.floor(total * 100.0 / cap);
            }
            var bar_type = "success";
            if (percentage > 90){
                bar_type = "danger";
            } else if (percentage > 80){
                bar_type = "warning";
            }
            var format = '<strong>Enrollment Progress</strong>: ' +
                         '<div class="progress" style="min-width: 100px">' +
                         '<div class="progress-bar progress-bar-'+bar_type+'" role="progressbar" aria-valuemin="0" aria-valuemax="100"' +
                         'aria-valuenow="' + percentage + '"  style="width: '+ percentage + '%;" +>' +
                         '<span class="sr-only">'+percentage+'% Complete</span>'+
                         total + " / " + cap +'</div>'+
                         '</div><br>';
            return format;
        }

        var data = event.data;
        var qtip_config = clone(event_qtip);
        var text =  term_desc_pair("Course Name", data.name)+
                    term_desc_pair("Instructors", data.instructors.join(" | ")) +
                    term_desc_pair("Start", moment(event.start).format("HH:mm"))+
                    term_desc_pair("End", moment(event.end).format("HH:mm"))+
                    term_desc_pair("Location",data.location)+
                    enrollment_progress(data.enrollment_total, data.enrollment_capacity);
        var content = {
            title: event.title,
            text:text
        };
        qtip_config.content = content;
        if (!tooltip_disabled || event.annotation){
            element.qtip(qtip_config);
        }
    }

    function removeEvents(ids){
        cls.fullCalendar('removeEvents', ids);
    }

    function renderEvents(event_data, isStick){
        cls.fullCalendar("renderEvent", event_data, isStick);
    }

    function renderBatchEvents(events){
        cls.fullCalendar( 'addEventSource', events );
    }

    function rerenderEvents(){
        cls.fullCalendar( 'rerenderEvents' );
    }

    function clear(){
        removeEvents();
        course_data = {};
        flattened_course_array = [];
        snap_info = {};
        tooltip_disabled = false;
        course_list_length = num_course_responded = 0;
    }

    function removePlaceholderEvents(extra_ids){
        var arr = [0];
        if (extra_ids){
            arr.concat(extra_ids);
        }
        removeEvents(arr);
    }

    function setNumberCourses(number){
        course_list_length = number;
    }

    function processScheduleResponse(response){
        function get_course_time_info(class_info){
            //get weekday
            var weekday_string = ["M","T","W","Th","F"];
            var weekday_list=[];
            var weekdays_str = class_info["weekdays"];
            if (!weekdays_str){
                return [];
            }
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

        var arrangetment_found = false;
        function events_have_overlap(event_list){
            var has_overlap = false;
            var len = event_list.length;
            for (var i=0; i<len; i++)
                for (var j=i+1; j<len; j++){
                    //if (event_list[i].data.type == "LEC" || event_list[j].data.type=="LEC") continue;
                    if (has_overlap) break;
                    var start_i = moment(event_list[i].start);
                    var start_j = moment(event_list[j].start);
                    var end_i = moment(event_list[i].end);
                    var end_j = moment(event_list[j].end);
                    if (!((start_i >= end_j) || (start_j >= end_i))){
                        has_overlap = true;
                    }
                }
            return has_overlap;
        }

        function auto_arrange_course(depth,complete_course_list,events_list){
            if (arrangetment_found) {return};
            if (depth >= complete_course_list.length){
                if (!events_have_overlap(events_list)){
                    arrangetment_found = true;
                    arranged_events = [].concat(events_list);
                }
                return;
            }
            for (var i=0; i<complete_course_list[depth].length; i++){
                var added_length = complete_course_list[depth][i].length;
                events_list = events_list.concat(complete_course_list[depth][i]);
                auto_arrange_course(depth+1, complete_course_list, events_list);
                for (var j=0;j<added_length;j++){
                    events_list.pop();
                }
            }
        }

        //TODO check response;
        var data = response["data"];
        var course_type_array = ["LEC","TUT","LAB"];//,"TST"];
        var events = [];
        var arranged_events = [];
        var events_list = [];
        var course_name = data[0]["subject"] + data[0]["catalog_number"];

        course_data[course_name] = {
            LEC: new Array(),
            TUT: new Array(),
            LAB: new Array(),
            TST: new Array()
        };

        $.each(data, function(index, obj){
            var course_type = obj["section"].substr(0,3);
            var id = course_name + obj["section"];
            var date = obj["classes"][0]["date"];
            var color_str = course_type + "_color";
            if (!(color_str in course_data[course_name])){
                course_data[course_name][color_str] = color.next_color();
                //console.log("course_data color? Y" + course_data[course_name][color_str]);
            } else {
                //console.log("course_data color? N" + course_data[course_name][color_str]);
            }
            var class_info = {
                start_time: date["start_time"],
                end_time: date["end_time"],
                weekdays: date["weekdays"]
            }
            var my_list = get_course_time_info(class_info);
            var classes = [];
            $.each(my_list, function(index, time_info){
                var event_data = {
                    data : {
                        type: course_type,
                        name: course_name,
                        weekdays:date["weekdays"],
                        enrollment_capacity: obj["enrollment_capacity"],
                        enrollment_total: obj["enrollment_total"],
                        instructors: obj["classes"][0]["instructors"],
                        location: obj["classes"][0]["location"]["building"] + " " + obj["classes"][0]["location"]["room"]
                    },
                    title: course_name + " - " + obj["section"],
                    id : id,
                    start: time_info["start"],
                    end: time_info["end"],
                    backgroundColor: course_data[course_name][color_str],
                    borderColor: course_data[course_name][color_str]
                }
                classes.push(event_data);
                //console.log("event_data? " + format(event_data));
            });
            course_data[course_name][course_type].push(classes);
        });

        $.each(course_type_array, function(index, course_type){
            if (course_data[course_name][course_type].length){
                flattened_course_array.push(course_data[course_name][course_type]);
            };
        });

        num_course_responded = num_course_responded + 1;
        if (num_course_responded >= course_list_length){
            submit_btn.stop_spin();
            events_list = [];
            arrangetment_found = false;
            auto_arrange_course(0,flattened_course_array,events_list);
            if (!(arranged_events.length)){
                for (var i=0; i<flattened_course_array.length; i++){
                    arranged_events = arranged_events.concat(flattened_course_array[i][0]);
                }
            }
            //console.log("ready! " + format(arranged_events));
            renderBatchEvents(arranged_events);
            return;
        }
    }

    return {
        init:init,
        removeEvents:removeEvents,
        clear:clear,
        removePlaceholderEvents:removePlaceholderEvents,
        addEvent:addEvent,
        processScheduleResponse:processScheduleResponse,
        setNumberCourses:setNumberCourses
    }
})();

var color = (function(){
    var unselected = ["#09AA77","#13AA98","#246B69","#283A77","#2F5E6F","#309166","#33993A","#3DECF5","#413091","#4309AE","#57246B","#69ADE8","#6AEC8F","#6B4024","#6E74CF","#6FF542","#7186EF","#7DE8BF","#87D4D0","#8CEDD3","#A188EC","#A9A2D7","#AB2BDA","#B83D91","#B8B3E6","#BABA5E","#BF4840","#CE7DD4","#D043C2","#E8E12C","#F35912","#FF706B","#FFB894","#FFC7E6","#FFD86B","#FFDA05"];
    var selected = [];

    function next_color(){
        var index = random_number(0,unselected.length-1);
        var color_str = unselected[index];
        selected.push(color_str);
        var index = unselected.indexOf(color_str);
        unselected.splice(index, 1);
        return color_str;
    }

    function clear(){
        $.each(selected, function(index, obj){
            unselected.push(obj);
        });
        selected = [];
        return;
    }

    return {
        next_color:next_color,
        clear:clear
    }
})();

var submit_btn=(function(){
    var l;
    function init(){
        console.log("submit_btn init called");
        l = Ladda.create( document.querySelector( '#form_submit_btn' ) );
    }
    function start_spin(){
        l.start();
    }
    function stop_spin(){
        l.stop();
    }
    return {
        init:init,
        start_spin:start_spin,
        stop_spin:stop_spin
    }
})();

var init = function(){
    console.log("course-selection.init called");
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

    select_obj.init();
    calendar.init();
    courses.init();
    submit_btn.init()
    $("#my_form").submit(on_form_submmit);
    $("#unselect_course_btn").click(on_list_unselect);
};

function on_list_unselect(e){
    select_obj.unselect_list();
    on_form_submmit(e);
}

function on_form_submmit(e){
    var selected_courses = [];

    function add_courses_to_calendar(){
        calendar.clear();
        color.clear();
        calendar.setNumberCourses(selected_courses.length);
        selected_courses.forEach(function(entry){
                var arr = entry.split(/\s+/);
                var subject = arr[0];
                var catalog_number = arr[1];
                uw_api.getCourseSchedule(subject, catalog_number, calendar.processScheduleResponse);
        });
    }
    if (e.preventDefault) e.preventDefault();
    submit_btn.start_spin();
    console.log("form submitted");
    $('.course_list option:selected').each(function(){
        selected_courses.push(this.getAttribute("value").toUpperCase());
    });
    add_courses_to_calendar();
    return false;

}