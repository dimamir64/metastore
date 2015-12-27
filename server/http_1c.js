/**
 * Сервер поддержки библиотеки интеграции 1С
 * - регистрирует изменения объектов 1С
 * - хранит информацию об используемых метаданных, синонимах и параметрах сессий
 * - отправляет в 1С изменения объектов, сделанные на стороне веб-приложения
 *
 * Created 24.11.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @license content of this file is covered by Oknosoft Commercial license. Usage without proper license is prohibited. To obtain it contact info@oknosoft.ru
 * @author  Evgeniy Malyarov
 * @module  http_1c
 */

var request = require('request');

module.exports = function ($p) {

	/**
	 * Регистрирует объект в таблице изменений
	 */
	function reg_from_1c(rtext) {

		var robj, ref;

		try {
			robj = JSON.parse(rtext);
			if($p.is_empty_guid(ref = $p.fix_guid(robj.obj.ref)))
				return;

		} catch (err){
			return console.error('JSON.parse', err);
		};

		// оповещаем клиентов об изменениях
		if($p.job_prm.network.socket)
			$p.job_prm.network.socket.broadcast(rtext);

		$p.wsql.postgres.cnn(function(err, client, done) {

			if(err)
				return console.error('error fetching client from pool', err);

			client.query('SELECT 1 from changes where zone=$1 and ref=$2;', [robj.zone, ref], function(err, result) {
				if(err){
					done();
					return console.error('error running query', err);
				}

				if(result.rows.length){
					client.query('UPDATE changes SET lc_changed=$3, class_name=$4, obj=$5 WHERE zone=$1 and ref=$2;',
						[robj.zone, ref, robj.lc_changed, robj.class_name, robj.obj], function(err, result) {
							done();
							if(err)
								return console.error('error running query', err);

						});

				}else{
					client.query('INSERT INTO changes (zone, ref, lc_changed, class_name, obj) VALUES ($1, $2, $3, $4, $5);',
						[robj.zone, ref, robj.lc_changed, robj.class_name, robj.obj], function(err, result) {
							done();
							if(err)
								return console.error('error running query', err);

						});
				}

			});
		});
	}

	function get_meta(response){

		$p.wsql.postgres('SELECT * from meta;')
			.then(function (result) {
				response.setHeader("Content-Type", "application/json");
				response.end(JSON.stringify(result.rows));
			})
			.catch(function (err) {
				end_error(response, err);
			});
	}

	/**
	 * Вытягивает из 1С список метаданных
	 * Разовая служебная функция переходного периода
	 */
	function fetch_meta() {

		// заполняем справочник ИдентификаторыОбъектовМетаданных
		var tattr = {
			fields: ["ref", "ПолноеИмя"],
			top: 10000,
			auth: $p.job_prm["1c"].auth,
			request: request
		};
		$p.rest.load_array(tattr, $p.cat.ИдентификаторыОбъектовМетаданных)
			.then(function (data) {
				$p.cat.ИдентификаторыОбъектовМетаданных.load_array(data, true);
			})
			.then(function () {
				tattr = {
					top: 10000,
					auth: $p.job_prm["1c"].auth,
					request: request
				};
				return $p.rest.load_array(tattr, $p.ireg.ИнтеграцияМетаданные);
			})
			.then(function (data) {
				var o, im;
				for(var i in data){

					o = data[i];

					if($p.is_guid(o.Объект)){
						o.ref = o.Объект;
						im = $p.cat.ИдентификаторыОбъектовМетаданных.get(o.ref);
						o.class_name = $p.md.class_name_from_1c(im.ПолноеИмя);

					}else{
						o.class_name = "enm." + o.Объект;
					}

					o.lc_changed_base = o.ДиапазонДат;
					o.cache = o.Кешировать ? 1 : 0;
					o.irest_enabled = o.РазрешенIREST;

					if(o.ТипРегистрации)
						o.reg_type = $p.enm.ИнтеграцияТипРегистрации[o.ТипРегистрации].order;
					else
						o.reg_type = 0;

					delete o.Объект;
					delete o.ДиапазонДат;
					delete o.Кешировать;
					delete o.РазрешенIREST;
					delete o.ТипРегистрации;

				}
				return data;
			})
			.then(function (data) {
				var index = -1,
					insert = "insert into meta (class_name, ref, cache, hide, lc_changed_base, irest_enabled, reg_type, meta, meta_patch) " +
						"values ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
					update = "update meta set class_name=$1, ref=$2, cache=$3, hide=$4, lc_changed_base=$5, irest_enabled=$6, reg_type=$7, meta=$8, meta_patch=$9 " +
						"where class_name=$10;";


				attr.pg.drv.connect(attr.pg.cnn, function(err, client, done) {

					function iteration(){
						index++;
						if(index < data.length){
							var obj = data[index];

							client.query('SELECT class_name from meta where class_name=$1;', [obj.class_name], function(err, result) {
								if(err){
									done();
									return console.error('error running query', err);
								}

								if(result.rows.length){
									client.query(update,
										[obj.class_name, obj.ref, obj.cache, obj.hide, obj.lc_changed_base, obj.irest_enabled, obj.reg_type, obj.meta, obj.meta_patch, obj.class_name],
										function(err, result) {
											if(err){
												done();
												return console.error('error running query', err);
											}

											iteration();

										});

								}else{
									client.query(insert,
										[obj.class_name, obj.ref, obj.cache, obj.hide, obj.lc_changed_base, obj.irest_enabled, obj.reg_type, obj.meta, obj.meta_patch],
										function(err, result) {
											if(err){
												done();
												return console.error('error running query', err);
											}

											iteration();

										});
								}

							});

						}else
							done();
					}

					if(err)
						return console.error('error fetching client from pool', err);

					iteration();

				});
			});

	}

	/**
	 * Вытягивает из 1С регистрацию объектов
	 * Разовая служебная функция переходного периода
	 */
	function fetch_changes(){

	}


	function end_error(response, err, text, done){
		if(done)
			done();
		response.statusCode = 500;
		response.end(text || err.toString());
	}

	function srv_1c(request, response) {

		var rtext="";

		if(request.method == "POST"){
			request.on("data", function(chunk) {
				rtext+=chunk.toString();
			});

			request.on("end", function() {
				response.end("OK");
				reg_from_1c(rtext);
			});

		}else if(request.method == "GET"){

			// возвращаем список используемых метаданных и синонимов
			if(request.url.startsWith("/meta")){
				get_meta(response);

			// возвращаем изменённых объектов, дата начала в параметрах
			}else if(request.url.startsWith("/pop")){
				response.end("200: "+request.url);

			// инициируем получение мета из 1С
			}else if(request.url.startsWith("/fetch_meta")){
				response.end("200: "+request.url);
				fetch_meta();

			// инициируем получение изменений из 1С
			}else if(request.url.startsWith("/fetch_changes")){
				response.end("200: "+request.url);
				fetch_changes();

			}else{
				response.statusCode = 404;
				response.end("404: Not Found: "+request.url);
			}

		}

	}

	// сервер http для администрирования системы
	var http_1c = require('http').createServer(srv_1c);
	http_1c.listen($p.job_prm.network["1c"]);

};