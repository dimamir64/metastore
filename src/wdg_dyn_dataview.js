/**
 * Динамическое dataview иерархического справочника
 *
 * Created 22.10.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @license content of this file is covered by Oknosoft Commercial license. Usage without proper license is prohibited. To obtain it contact info@oknosoft.ru
 * @author  Evgeniy Malyarov
 * @module  wdg_dyn_dataview
 */

/**
 * ### Визуальный компонент - динамическое представление элементов справочника
 * - Отображает коллекцию объектов на основе пользовательских шаблонов (список, мозаика, иконы и т.д.)
 * - Унаследован от [dhtmlXDataView](http://docs.dhtmlx.com/dataview__index.html)
 * - Автоматически связывается с irest-сервисом библиотеки интеграции 1С
 *
 * Особенность dhtmlx: экземпляр создаётся не конструктором, а функцией `attachDynDataView` (без `new`) и размещается в ячейке dhtmlXCellObject
 *
 * @class ODynDataView
 * @param mgr {DataManager}
 * @param attr {Object} - параметры создаваемого компонента
 * @param attr.type {Object} - шаблон и параметры
 * @param [attr.filter] {Object} - отбор + период
 * @param [callback] {Function} - если указано, будет вызвана после инициализации компонента
 * @constructor
 */
dhtmlXCellObject.prototype.attachDynDataView = function(mgr, attr) {

	if(!attr)
		attr = {};

	var conf = {
		type: attr.type || { template:"#name#" },
		select: attr.select || true
	},
		timer_id,
		dataview;

	if(attr.pager)
		conf.pager = attr.pager;
	if(attr.hasOwnProperty("drag"))
		conf.drag = attr.drag;
	if(attr.hasOwnProperty("select"))
		conf.select = attr.select;
	if(attr.hasOwnProperty("multiselect"))
		conf.multiselect = attr.multiselect;
	if(attr.hasOwnProperty("height"))
		conf.height = attr.height;
	if(attr.hasOwnProperty("tooltip"))
		conf.tooltip = attr.tooltip;
	if(attr.hasOwnProperty("autowidth"))
		conf.autowidth = attr.autowidth;
	if(!attr.selection)
		attr.selection = {};

	// список пользовательских стилей для текущего dataview
	// если название стиля содержит подстроку 'list', элементы показываются в одну строку
	if(attr.custom_css){
		if(!Array.isArray(attr.custom_css))
			attr.custom_css = ["list", "large", "small"];
		attr.custom_css.forEach(function (type) {
			dhtmlXDataView.prototype.types[type].css = type;
		})
	}

	// создаём DataView
	if(attr.container){
		conf.container = attr.container;
		dataview = new dhtmlXDataView(conf);
	}else
		dataview = this.attachDataView(conf);

	// и элемент управления режимом просмотра
	// список кнопок можно передать снаружи. Если не указан, создаются три кнопки: "list", "large", "small"
	if(attr.custom_css && attr.custom_css.length > 1)
		dv_tools = new $p.iface.OTooolBar({
			wrapper: attr.outer_container || this.cell, width: '86px', height: '28px', bottom: '2px', right: '28px', name: 'dataview_tools',
			buttons: attr.buttons || [
				{name: 'list', css: 'tb_dv_list', title: 'Список (детально)', float: 'left'},
				{name: 'large', css: 'tb_dv_large', title: 'Крупные значки', float: 'left'},
				{name: 'small', css: 'tb_dv_small', title: 'Мелкие значки', float: 'left'}
			],
			onclick: function (name) {
				var template = dhtmlXDataView.prototype.types[name];
				if(name.indexOf("list") != -1)
					dataview.config.autowidth = 1;
				else
					dataview.config.autowidth = Math.floor((dataview._dataobj.scrollWidth) / (template.width + template.padding*2 + template.margin*2 + template.border*2));
				dataview.define("type", name);
				//dataview.refresh();
			}
		});

	dataview.__define({

		/**
		 * Фильтр, налагаемый на DataView
		 */
		selection: {
			get: function () {

			},
			set: function (v) {
				if(typeof v == "object"){
					for(var key in v)
						attr.selection[key] = v[key];
				}
				this.lazy_timer();
			}
		},

		requery: {
			value: function () {
				attr.url = "";
				$p.rest.build_select(attr, mgr);
				if(attr.filter_prop)
					attr.url+= "&filter_prop=" + JSON.stringify(attr.filter_prop);
				if(dhx4.isIE)
					attr.url = encodeURI(attr.url);
				dataview.clearAll();
				if(dataview._settings)
					dataview._settings.datatype = "json";
				dataview.load(attr.url, "json", function(v){
					if(v){
						dataview.show(dataview.first());
					}
				});
				timer_id = 0;
			}
		},

		requery_list: {
			value: function (list) {

				var _mgr = $p.md.mgr_by_class_name(mgr.class_name);

				function do_requery(){
					var query = [], obj, dv_obj;

					list.forEach(function (o) {
						obj = _mgr.get(o.ref || o, false, true);
						if(obj){
							dv_obj = ({})._mixin(obj._obj);
							dv_obj.id = obj.ref;
							if(o.count)
								dv_obj.count = o.count;
							if(!dv_obj.Код && obj.id)
								dv_obj.Код = obj.id;
							query.push(dv_obj);
						}
					});
					dataview.clearAll();
					dataview.parse(query, "json");
				}

				return _mgr.load_cached_server_array(list, mgr.rest_name).then(do_requery);

			}
		},

		lazy_timer: {
			value: function(){
				if(timer_id)
					clearTimeout(timer_id);
				timer_id = setTimeout(dataview.requery, 200);
			}
		}
	});

	if(attr.hash_route){

		$p.eve.hash_route.push(attr.hash_route);

		setTimeout(function(){
			attr.hash_route($p.job_prm.parse_url());
		}, 50);
	}


	return dataview;

};

