/**
 *
 * Created 05.11.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @license content of this file is covered by Oknosoft Commercial license. Usage without proper license is prohibited. To obtain it contact info@oknosoft.ru
 * @author    Evgeniy Malyarov
 * @module  templates.js
 */

function init_templates() {

	// строка стиля картинки
	function get_image_style(o){
		if(o.ФайлКартинки != $p.blank.guid){
			return "background-image:url(templates/product_pics/"+o.ФайлКартинки+".png);";
		}
		return "";
	}

	// строка представления производителя
	function get_manufacturer(o){
		if(o.Производитель != $p.blank.guid){
			return $p.cat.Производители.get(o.Производитель).presentation;
		}
		return "";
	}

	// цена
	function get_price(o){
		if((!o.Цена_Мин || !o.Цена_Макс) && o.Характеристики){
			var x = JSON.parse(o.Характеристики);
			for(var i in x){
				if(!o.Цена_Мин || (x[i].Цена_Мин && o.Цена_Мин > x[i].Цена_Мин))
					o.Цена_Мин = x[i].Цена_Мин;
				if(!o.Цена_Макс || (x[i].Цена_Макс && o.Цена_Макс < x[i].Цена_Макс))
					o.Цена_Макс = x[i].Цена_Макс;
			}
		}
		if(!o.Цена_Мин)
			o.Цена_Мин = 0;
		if(!o.Цена_Макс)
			o.Цена_Макс = 0;
		return (o.Цена_Мин == o.Цена_Макс ? o.Цена_Мин.toFixed(0) : 'от ' + o.Цена_Мин.toFixed(0) + ' до ' + o.Цена_Макс.toFixed(0)) +
			' <i class="fa fa-rub" style="font-size: smaller; color: #747f7f"></i>';
	}

	function get_amount(o){
		get_price(o);
		return (o.Цена_Макс * o.count).toFixed(0) + ' <i class="fa fa-rub" style="font-size: smaller; color: #747f7f"></i>';
	};

	// определяем представления DataView
	dhtmlx.Type.add(dhtmlXDataView,{
		name:"list",
		template: $p.injected_data["dataview_list.html"],
		template_loading:"Загрузка данных...",
		height: 96,
		width: 900,
		margin: 2,
		padding:0,
		border: 1,
		image:get_image_style,
		manufacturer: get_manufacturer,
		price: get_price
	});

	dhtmlx.Type.add(dhtmlXDataView,{
		name:"cart",
		template: $p.injected_data["dataview_cart.html"],
		height: 96,
		width: 800,
		margin: 2,
		padding:0,
		border: 1,
		image: get_image_style,
		price: get_amount
	});

	dhtmlx.Type.add(dhtmlXDataView,{
		name:"large",
		template: $p.injected_data["dataview_large.html"],
		height: 210,
		width: 380,
		margin: 2,
		padding:2,
		border: 1,
		image:get_image_style,
		manufacturer: get_manufacturer,
		price: get_price
	});

	dhtmlx.Type.add(dhtmlXDataView,{
		name:"small",
		template: $p.injected_data["dataview_small.html"],
		height: 180,
		width: 220,
		margin: 2,
		padding:2,
		border: 1,
		image:get_image_style,
		manufacturer: get_manufacturer,
		price: get_price
	});

	dhtmlx.Type.add(dhtmlXDataView,{
		name:"viewed",
		template: $p.injected_data["dataview_viewed.html"],
		height: 180,
		width: 220,
		margin: 2,
		padding:2,
		border: 1,
		image:get_image_style,
		manufacturer: get_manufacturer,
		price: get_price
	});


};
