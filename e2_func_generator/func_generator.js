
e2_types = [
    "number",
    "string",
    "entity",
    "vector2",
    "vector",
    "vector4",
    "angle",
    "table",
    "array",
    "quaternion",
    "ranger",
    // ["matrix?"],
    // ["bone?"],
    // ["wirelink?"],
    // ["complex?"],
]

abbreviations = {
    "num": "number",
    "str": "string",
    "ent": "entity",
    "vec2": "vector2",
    "vec": "vector",
    "vec4": "vector4",
    "ang": "angle",
    "tbl": "table",
    "arr": "array",
    "quat": "quaternion",
    "rd": "ranger",
}

$(document).ready(function(){  
    parsed_inputs=""

    $("#e2_input").change(function(){
        // set parsed inputs
        parsed_inputs = process_inputs(document.getElementById("e2_input").value)

        render_parse_preview(parsed_inputs["parsed"], parsed_inputs["groups"])

        // TODO: store groups style sheet and remove it before creating a new one so they don't just stack up
        add_group_styles()

        // set groups display
        render_group_menus(parsed_inputs["groups"])

        render_e2_output(parsed_inputs["groups"])
    })

})


function render_parse_preview(parsed, groups){
    // set preview
    document.getElementById("parse_preview").innerHTML = generate_conversions(parsed, groups).join("\n\n")
    
    // converts a mark back and forth between a bold tag when clicked
    $(".marked").click(function(){
        $(this).toggleClass("marked")
        render_e2_output(parsed_inputs["groups"])
    })
}

function render_group_menus(groups){
    var group_menus = $("#groups")
    group_menus.html("")

    Object.keys(groups).forEach(function(group_key){
        var group = groups[group_key]

        var group_menu = $(document.createElement("div"))
        group_menu.addClass(`group${group["index"]}`)

        // generate ul of existing conversions
        var conversions_list = $(document.createElement("ul"))
        group["conversions"].forEach(function(conversion){
            var conversion_item = $(document.createElement("li"))
            conversion_item.text(conversion)

            conversions_list.append(conversion_item)
        })
        group_menu.append(conversions_list)

        // generate select list of remaining e2 types
        var conversions_dropdown = $(document.createElement("select"))
        $(e2_types).not(group["conversions"]).get().forEach(function(types){
            $('<option />', {value: types, text: types}).appendTo(conversions_dropdown)
        })
        group_menu.append(conversions_dropdown)

        // add button
        var add_conversion_button = $(document.createElement("button"))
        add_conversion_button.text("add conversion to group")
        group_menu.append(add_conversion_button)
        // on button click add selected option to group list and remove from select box
        add_conversion_button.click(function(){
            // add to conversions list
            var conversion_item = $(document.createElement("li"))
            conversion_item.text(conversions_dropdown.val())
            conversions_list.append(conversion_item)
            group["conversions"].push(conversions_dropdown.val())
            // remove from select box
            conversions_dropdown.find(":selected").remove()

            // re render with new conversions
            render_e2_output(groups)
        })

        group_menus.append(group_menu)
    })
}

function render_e2_output(groups){
    //clone preview
    preview_clone = $("#parse_preview").clone()

    // substitute marked marks
    preview_clone.find("mark.marked").each(function(){
        $(this).text(this.getAttribute("data-sub"))
    })

    // set output
    $("#e2_output").html(generate_conversions(preview_clone.text(), groups).join("\n\n"))
}



function process_inputs(e2_snippet){

    var parsed_inputs = {
        "raw": e2_snippet,
        "parsed": e2_snippet,
        "groups": {}
    }

    // do the replacement matches for the long forms
    var regex = RegExp(`(${e2_types.join("|")})`, "gi")
    parsed_inputs["parsed"] = parsed_inputs["parsed"].replace(regex, function(matched_string){
        var group_key = matched_string.toLowerCase()
        var group = parsed_inputs["groups"][group_key] = parsed_inputs["groups"][group_key] || {
            "index": Object.keys(parsed_inputs["groups"]).length,
            "color": get_random_color(),
            "styles": {},
            "conversions": [group_key]
        }

        var style = group["styles"][matched_string] = group["styles"][matched_string] || {
            "index": Object.keys(group["styles"]).length,
            "raw": matched_string,
        }

        return style["substituted"] = "---" + group["index"] + ":" + style["index"] + "---"
    })

    // TODO: dry up these functions
    // do the replacement matches for the abbr forms
        // must specifically not have a word boundary on both sides
    regex = RegExp(`\\B(${Object.keys(abbreviations).join("|")})|(${Object.keys(abbreviations).join("|")})\\B`, "gi")
    parsed_inputs["parsed"] = parsed_inputs["parsed"].replace(regex, function(matched_string){
        var group_key = abbreviations[matched_string.toLowerCase()]
        var group = parsed_inputs["groups"][group_key] = parsed_inputs["groups"][group_key] || {
            "index": Object.keys(parsed_inputs["groups"]).length,
            "color": get_random_color(),
            "styles": {},
            "conversions": [group_key]
        }

        var style = group["styles"][matched_string] = group["styles"][matched_string] || {
            "index": Object.keys(group["styles"]).length,
            "raw": matched_string,
            "abbreviation": true
        }

        return style["substituted"] = "---" + group["index"] + ":" + style["index"] + "---"
    })

    return parsed_inputs
}

function add_group_styles(){
    var style = document.createElement("style")
    document.head.appendChild(style)

    Object.values(parsed_inputs["groups"]).forEach(function(group){
        style.sheet.insertRule(`mark.marked.group${group["index"]} { background: ${group["color"]} }`, 0)
        style.sheet.insertRule(`div.group${group["index"]} { background: ${group["color"]} }`, 0)
    })

    return style
}

// TODO: if there would be no replaces for the current group might want to map to empty array for the group 
// loops through the groups and generates all combinations of the various groups' conversions
function generate_conversions(parsed, groups){
    var generated_output = [parsed]

    // for each group
    Object.values(groups).forEach(function(group){
        // map each group's conversions 
        generated_output = group["conversions"].map(function(conversion){
            // to the map of the generation
            return generated_output.map(function(generation){
                // for each style
                Object.values(group["styles"]).forEach(function(style){
                    // TODO: apply style to conversion before replace
                    var styled_conversion = apply_style(style, conversion)

                    // find and replace each occurrence of group/style in generation with the conversion
                    generation = generation.replace(
                        RegExp(`(${style["substituted"]})`, "gi"), 
                        `<mark class="group${group["index"]} marked" data-sub="${style["substituted"]}">${styled_conversion}</mark>`
                    )
                })

                return generation
            })
        }).flat()
    })

    return generated_output
}


function apply_style(style, conversion){
    if (style["abbreviation"]){
        // modify value of conversion to be an abbreviation // if no abbreviation is found truncate to be the same length as the original value
        conversion = get_abbreviation_for_conversion(conversion) || conversion.substring(0, style["raw"].length)
    }

    if (style["raw"] === style["raw"].toUpperCase()){
        return conversion.toUpperCase()
    }
    if (style["raw"].charAt(0) === style["raw"].charAt(0).toUpperCase()){
        return conversion.charAt(0).toUpperCase() + conversion.slice(1)
    }
    return conversion
}

// returns the first found abbreviation for a given e2_type
    // if no abbreviation is found it returns null
function get_abbreviation_for_conversion(conversion){
    for(key in abbreviations){
        if (abbreviations[key] == conversion){
            return key
        }
    }
}

// https://stackoverflow.com/questions/1484506/random-color-generator
function get_random_color(){
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

