/**
 *
 * Created 10.11.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @license content of this file is covered by Oknosoft Commercial license. Usage without proper license is prohibited. To obtain it contact info@oknosoft.ru
 * @author  Evgeniy Malyarov
 * @module  wdg_products_view
 */

/**
 * ### Визуальный компонент списка товаров
 * - Отображает dataview товаров
 * - В шапке содержит хлебные крошки и фильтр по подстроке
 * - Использует [dhtmlxLayout](http://docs.dhtmlx.com/layout__index.html) и ODynDataView
 * - Автоматически перерисовывается при изменении отбора по виду номенклатуры
 *
 * Особенность dhtmlx: экземпляр создаётся не конструктором, а функцией `attachOProductsView` (без `new`) и размещается в ячейке dhtmlXCellObject
 *
 * @class OProductsView
 * @param attr {Object} - параметры создаваемого компонента
 * @constructor
 */
dhtmlXCellObject.prototype.attachOProductsView = function(attr) {

	if(!attr)
		attr = {};


	var _cell = this.cell,

	// внешний контейнер
		layout = document.createElement('div'),

	// указатель на хлебные крошки
		path,

	// указатель на dataview и параметры dataview
		dataview, dataview_attr;


	this.attachObject(layout);

	// Область строки поиска
	(function(){

		// шапка
		var div_head = document.createElement('div'),

		// контейнер строки поиска
			div_search = document.createElement('div'),

		// собственно, строка поиска
			input_search = document.createElement('input'),

		// икона поиска
			icon_search = document.createElement('i');

		div_head.className = "md_column320";
		layout.appendChild(div_head);

		if($p.device_type != "desktop")
			div_head.style.padding = "4px 8px";

		// хлебные крошки
		path = new $p.iface.CatalogPath(div_head);

		// строка поиска
		div_search.className = "search";
		div_head.appendChild(div_search);
		div_search.appendChild(input_search);
		div_search.appendChild(icon_search);
		icon_search.className="icon_search fa fa-search";
		input_search.className = "search";
		input_search.type = "search";
		input_search.placeholder = "Введите артикул или текст";
		input_search.title = "Найти товар по части наименования, кода или артикула";
		input_search.onchange = function (e) {
			dhx4.callEvent("search_text_change", [this.value]);
			this.blur();
		}

	})();

	// Область сортировки
	(function(){

		var md_column320 = document.createElement('div'),
			sort = document.createElement('div'),
			values = [
				'по возрастанию цены <i class="fa fa-sort-amount-asc fa-fw"></i>',
				'по убыванию цены <i class="fa fa-sort-amount-desc fa-fw"></i>',
				'по наименованию <i class="fa fa-sort-alpha-asc fa-fw"></i>',
				'по наименованию <i class="fa fa-sort-alpha-desc fa-fw"></i>',
				'по популярности <i class="fa fa-sort-numeric-asc fa-fw"></i>',
				'по популярности <i class="fa fa-sort-numeric-desc fa-fw"></i>'
			];

		md_column320.className = "md_column320";
		layout.appendChild(md_column320);
		md_column320.appendChild(sort);

		$p.iface.ODropdownList({
			container: sort,
			title: "Сортировать:" + ($p.device_type == "desktop" ? "<br />" : " "),
			values: values,
			class_name: "catalog_path",
			event_name: "sort_change"
		});

		dhx4.attachEvent("sort_change", function (v) {
			$p.record_log(v);
		});

	})();

	// Область ODynDataView
	(function(){

		// пагинация
		var div_pager = document.createElement('div'),

		// контейнер dataview
			div_dataview = document.createElement('div'),

		// внешний контейнер dataview
			div_dataview_outer = document.createElement('div');

		// получаем заготовку номенклдатуры с минимальными полями
		function nom_from_id(id){
			var dv_obj = ({})._mixin(dataview.get(id));
			dv_obj.ref = dv_obj.id;
			dv_obj.id = dv_obj.Код;
			dv_obj._not_set_loaded = true;
			delete dv_obj.Код;
			return $p.cat.Номенклатура.create(dv_obj);
		}

		// ODynDataView
		layout.appendChild(div_dataview_outer);
		div_dataview_outer.appendChild(div_dataview);

		div_pager.classList.add("wb-tools");
		div_dataview_outer.style.clear = "both";
		div_dataview_outer.style.height = div_dataview.style.height = _cell.offsetHeight + "px";
		div_dataview_outer.style.width = div_dataview.style.width = _cell.offsetWidth + "px";

		dataview_attr = {
			container: div_dataview,
			outer_container: div_dataview_outer,
			type: "list",
			custom_css: true,
			autowidth: 1,
			pager: {
				container: div_pager,
				size:30,
				template: "{common.prev()}<div class='paging_text'> Страница {common.page()} из #limit#</div>{common.next()}"
			},
			fields: ["ref", "name"],
			selection: {},
			hash_route : function (hprm) {
				if(hprm.obj && dataview_attr.selection.ВидНоменклатуры != hprm.obj){

					// обновляем вид номенклатуры и перевзводим таймер обновления
					dataview_attr.selection.ВидНоменклатуры = hprm.obj;
					dataview.lazy_timer();

				}
			}
		};
		dataview = dhtmlXCellObject.prototype.attachDynDataView(
			{
				rest_name: "Module_ИнтеграцияСИнтернетМагазином/СписокНоменклатуры/",
				class_name: "cat.Номенклатура"
			}, dataview_attr);

		// обработчик события изменения текста в строке поиска
		dhx4.attachEvent("search_text_change", function (text) {
			// обновляем подстроку поиска и перевзводим таймер обновления
			if(text)
				dataview_attr.selection.text = function (){
					return "text like '%25" + text + "%25'";
				};
			else if(dataview_attr.selection.hasOwnProperty("text"))
				delete dataview_attr.selection.text;

			dataview.lazy_timer();

		});

		dhx4.attachEvent("filter_prop_change", function (filter_prop) {

			// обновляем подстроку поиска и перевзводим таймер обновления
			dataview_attr.filter_prop = filter_prop;
			dataview.lazy_timer();

		});

		// подключаем пагинацию
		div_dataview_outer.appendChild(div_pager);

		// подключаем контекстное меню

		// подписываемся на события dataview
		dataview.attachEvent("onAfterSelect", function (id){
			// your code here
		});

		dataview.attachEvent("onItemDblClick", function (id, ev, html){

			var hprm = $p.job_prm.parse_url();

			nom_from_id(id)
				.then(function (o) {
					$p.iface.set_hash(hprm.obj, id, hprm.frm, hprm.view);
				});

			return false;
		});

		// подписываемся на событие изменения размера во внешнем layout и изменение ориентации устройства
		dhx4.attachEvent("layout_resize", function (layout) {
			div_dataview_outer.style.height = div_dataview.style.height = _cell.offsetHeight + "px";
			div_dataview_outer.style.width = div_dataview.style.width = _cell.offsetWidth + "px";
			dataview.refresh();
		});

		div_dataview.addEventListener('click', function (e) {
			var target = e.target,
				elm = dataview.get_elm(e.target);

			if(elm){

				if(target.classList.contains("dv_icon_cart")){
					nom_from_id(elm.id)
						.then(function (o) {
							dhx4.callEvent("order_cart", [o]);
						});

				}else if(target.classList.contains("dv_icon_add_compare")){
					nom_from_id(elm.id)
						.then(function (o) {
							dhx4.callEvent("order_compare", [o]);
						});

				}else if(target.classList.contains("dv_icon_detail"))
					dataview.callEvent("onItemDblClick", [elm.id]);
			}
		}, false);


	})();


	return dataview;
};

$p.iface.CatalogPath = function CatalogPath(parent, onclick){

	var id = undefined,
		div = document.createElement('div');
	div.className = "catalog_path";
	parent.appendChild(div);

	// Обработчик маршрутизации
	function hash_route (hprm) {
		if(id != hprm.obj){
			id = hprm.obj;

			var child,
			// получаем массив пути
				path = $p.cat.ВидыНоменклатуры.path(id);

			// удаляем предыдущие элементы
			while(child = div.lastChild){
				div.removeChild(child);
			}

			var a = document.createElement('span');
			if(path.length && path[0].presentation)
				a.innerHTML = '<i class="fa fa-folder-open-o"></i> ';
			else
				a.innerHTML = '<i class="fa fa-folder-open-o"></i> Поиск во всех разделах каталога';
			div.appendChild(a);

			// строим новый путь
			while(child = path.pop()){

				if(div.children.length > 1){
					a = document.createElement('span');
					a.innerHTML = " / ";
					div.appendChild(a);
				}
				a = document.createElement('a');
				a.innerHTML = child.presentation;
				a.ref = child.ref;
				a.href = "#";
				a.onclick = onclick || function (e) {
					var hprm = $p.job_prm.parse_url();
					if(hprm.obj != this.ref)
						$p.iface.set_hash(this.ref, "", hprm.frm, hprm.view);
					return $p.cancel_bubble(e)
				};
				div.appendChild(a);
			}

		}
	};

	// подписываемся на событие hash_route
	$p.eve.hash_route.push(hash_route);

	setTimeout(function () {
		hash_route($p.job_prm.parse_url());
	}, 50);

}