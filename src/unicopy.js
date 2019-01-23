Unicopy=(function($,window,document,UCD,PUA,ENTITYDB){

var clickToSelect = function(ie, be) {
	(be || ie).bind('click', function() {
		ie.select();
	});
};

var clickToCopy = function(ie, be) {
	(be || ie).bind('click', function() {
		ie.select();
		document.execCommand('copy');
	});
};

var stringToChars = function(s) {
	var i = 0;
	var n = s.length;
	var a = [];
	var c;
	while (i < n) {
		a.push(c = s.codePointAt(i));
		i += String.fromCodePoint(c).length;
	}
	return a;
};

var charsToString = function(a) {
	var s = '';
	for (var i = 0, n = a.length; i < n; i++) {
		s += String.fromCodePoint(a[i]);
	}
	return s;
};

var charsToUTF8 = function(a) {
	var b = [];
	for (var i = 0, n = a.length; i < n; i++) {
		if (a[i] < 0) {
			continue;
		} else if (a[i] < 0x80) {
			b.push(a[i]);
		} else if (a[i] < 0x800) {
			b.push(
				0xC0 | (a[i] >> 6),
				0x80 | (a[i] & 0x3F)
			);
		} else if (a[i] < 0x10000) {
			b.push(
				0xE0 | (a[i] >> 12),
				0x80 | ((a[i] >> 6) & 0x3F),
				0x80 | (a[i] & 0x3F)
			);
		} else if (a[i] < 0x110000) {
			b.push(
				0xF0 | (a[i] >> 18),
				0x80 | ((a[i] >> 12) & 0x3F),
				0x80 | ((a[i] >>  6) & 0x3F),
				0x80 | (a[i] & 0x3F)
			);
		}
	}
	return b;
};

var charsToUTF16 = function(a) {
	var b = [];
	for (var i = 0, n = a.length; i < n; i++) {
		if (a[i] < 0) {
			continue;
		} else if (a[i] < 0x10000) {
			b.push(a[i]);
		} else if (a[i] < 0x110000) {
			b.push(
				0xD800 | ((a[i] - 0x10000) >> 10),
				0xDC00 | ((a[i] - 0x10000) & 0x3FF)
			);
		}
	}
	return b;
};

var toHex = function(i, p) {
	var h = i.toString(16).toUpperCase();
	if (p) while (h.length < p) h = '0' + h;
	return h;
};

var arrayToHex = function(a, p, prefix, suffix) {
	var b = [];
	for (var i = 0, n = a.length; i < n; i++) {
		b.push(
			(prefix || '') +
			toHex(a[i], p) +
			(suffix || '')
		);
	}
	return b;
};

var arrayToHexDump = function(a, p, le) {
	var b = [];
	for (var i = 0, n = a.length; i < n; i++) {
		if (p > 6 && !le) b.push(toHex((a[i] >> 24) & 0xFF, 2));
		if (p > 4 && !le) b.push(toHex((a[i] >> 16) & 0xFF, 2));
		if (p > 2 && !le) b.push(toHex((a[i] >>  8) & 0xFF, 2));
		b.push(toHex(a[i] & 0xFF, 2));
		if (p > 2 &&  le) b.push(toHex((a[i] >>  8) & 0xFF, 2));
		if (p > 4 &&  le) b.push(toHex((a[i] >> 16) & 0xFF, 2));
		if (p > 6 &&  le) b.push(toHex((a[i] >> 24) & 0xFF, 2));
	}
	return b;
};

var getCharacterData = function(cp, pua) {
	var data = UCD['chars'][cp];
	if (data) return data;
	$.each(UCD['ranges'], function(k, v) {
		if (cp >= v[0] && cp <= v[1]) {
			if (k.substr(-11) === 'Private Use' && pua && pua.length) {
				for (var i = 0, n = pua.length; i < n; i++) {
					if (PUA[pua[i]] && PUA[pua[i]]['chars']) {
						data = PUA[pua[i]]['chars'][cp];
						if (data) return false;
					}
				}
			}
			data = v[2].slice();
			data[0] = toHex(cp, 4);
			if (k.substr(-11) === 'Private Use') {
				data[1] = 'PRIVATE USE-' + data[0];
			} else if (k.substr(0, 13) === 'CJK Ideograph') {
				data[1] = 'CJK UNIFIED IDEOGRAPH-' + data[0];
			} else {
				data[1] = k.toUpperCase() + '-' + data[0];
			}
			return false;
		}
	});
	if (data) return data;
	return [
		toHex(cp, 4), 'UNDEFINED-' + toHex(cp, 4),
		'Cn', '0', 'BN', '', '', '', '',
		'N', '', '', '', '', ''
	];
};

var getCharacterName = function(cp, pua) {
	var data = getCharacterData(cp, pua);
	if (!data) return null;
	if (data[1] === '<control>') return data[10];
	return data[1];
};

var charsToItems = function(chars, pua) {
	if (chars && chars.length) {
		var s = charsToString(chars);
		var utf8 = charsToUTF8(chars);
		var utf16 = charsToUTF16(chars);
		var names = [];
		var entities = [];
		var python = [];
		for (var i = 0, n = chars.length; i < n; i++) {
			names.push(getCharacterName(chars[i], pua));
			entities.push(ENTITYDB[chars[i]] || ('&#' + chars[i] + ';'));
			python.push(
				(chars[i] < 0x10000)
				? ('\\u' + toHex(chars[i], 4))
				: ('\\U' + toHex(chars[i], 8))
			);
		}
		var items = [];
		items.push(['#', s]);
		for (var i = 0, n = names.length; i < n; i++) items.push(['##', names[i]]);
		items.push(['-']);
		items.push(['Text', s]);
		items.push(['Dec', chars.join(', ')]);
		items.push(['Hex', arrayToHex(chars, 4).join(', ')]);
		items.push(['U+', 'U+' + arrayToHex(chars, 4).join('+')]);
		items.push(['Name', names.join(', ')]);
		items.push(['-']);
		items.push(['HTML Name', entities.join('')]);
		items.push(['HTML Dec', '&#' + chars.join(';&#') + ';']);
		items.push(['HTML Hex', arrayToHex(chars, 0, '&#x', ';').join('')]);
		items.push(['URL', arrayToHex(utf8, 2, '%').join('')]);
		items.push(['C/C++', arrayToHex(utf8, 2, '\\x').join('')]);
		items.push(['Java', arrayToHex(utf16, 4, '\\u').join('')]);
		items.push(['Python Text', 'u\'' + s + '\'']);
		items.push(['Python Hex', 'u\'' + python.join('') + '\'']);
		items.push(['-']);
		items.push(['UTF-8',    arrayToHexDump(utf8,  2       ).join(' ')]);
		items.push(['UTF-16BE', arrayToHexDump(utf16, 4, false).join(' ')]);
		items.push(['UTF-16LE', arrayToHexDump(utf16, 4, true ).join(' ')]);
		items.push(['UTF-32BE', arrayToHexDump(chars, 8, false).join(' ')]);
		items.push(['UTF-32LE', arrayToHexDump(chars, 8, true ).join(' ')]);
		return items;
	}
};

var popup = null;
var closePopup = function() {
	if (popup) {
		popup.remove();
		popup = null;
	}
};

var popupItems = function(e, items) {
	closePopup();
	if (items && items.length) {
		popup = $('<div/>');
		popup.addClass('unicopy-popup');
		var close = $('<div/>');
		close.addClass('unicopy-close');
		close.text('\u00D7');
		close.bind('click', closePopup);
		popup.append(close);
		for (var i = 0, n = items.length; i < n; i++) {
			if (items[i][0] === '-') {
				var hr = $('<hr/>');
				hr.addClass('unicopy-hr');
				popup.append(hr);
			} else if (items[i][0] === '#') {
				var h1 = $('<h1/>');
				h1.addClass('unicopy-h1');
				h1.text(items[i][1]);
				popup.append(h1);
			} else if (items[i][0] === '##') {
				var h2 = $('<h2/>');
				h2.addClass('unicopy-h2');
				h2.text(items[i][1]);
				popup.append(h2);
			} else {
				var label = $('<label/>');
				label.addClass('unicopy-label');
				label.text(items[i][0]);
				var input = $('<input/>');
				input.addClass('unicopy-input');
				input.attr('type', 'text');
				input.attr('readonly', true);
				input.attr('value', items[i][1]);
				var button = $('<button/>');
				button.addClass('unicopy-button');
				button.text('Copy');
				var row = $('<div/>');
				row.addClass('unicopy-row');
				row.append(label);
				row.append(input);
				row.append(button);
				popup.append(row);
				clickToSelect(input);
				clickToCopy(input, button);
			}
		}
		popup.offset({ left: e.pageX, top: e.pageY });
		popup.bind('click', function(e) { e.stopPropagation(); });
		$('body').append(popup);
	}
	return popup;
};

var popupChars = function(e, chars, pua) {
	return popupItems(e, charsToItems(chars, pua));
};

var popupString = function(e, s, pua) {
	return popupChars(e, stringToChars(s), pua);
};

var bindToPopup = function(elem, s, pua) {
	elem.bind('click', function(e) {
		e.stopPropagation();
		popupString(e, s, pua);
	});
	elem.css({
		'-webkit-user-select': 'none',
		'-khtml-user-select': 'none',
		'-moz-user-select': 'none',
		'-ms-user-select': 'none',
		'user-select': 'none',
		'cursor': 'pointer'
	});
};

var bindToPopups = function(elems, dpua) {
	elems.each(function() {
		var elem = $(this);
		var s = elem.attr('data-unicopy-text') || elem.text();
		var pua = elem.attr('data-unicopy-pua');
		bindToPopup(elem, s, (pua ? pua.split(',') : dpua));
	});
};

$(document).ready(function() {
	$('body').bind('click', closePopup);
	var dpua = $('body').attr('data-unicopy-pua');
	bindToPopups($('.unicopy'), dpua && dpua.split(','));
});

return {
	clickToSelect: clickToSelect,
	clickToCopy: clickToCopy,
	stringToChars: stringToChars,
	charsToString: charsToString,
	charsToUTF8: charsToUTF8,
	charsToUTF16: charsToUTF16,
	toHex: toHex,
	arrayToHex: arrayToHex,
	arrayToHexDump: arrayToHexDump,
	getCharacterData: getCharacterData,
	getCharacterName: getCharacterName,
	bindToPopup: bindToPopup,
	bindToPopups: bindToPopups,
	popupItems: popupItems,
	popupChars: popupChars,
	popupString: popupString,
	closePopup: closePopup
};

})(jQuery,window,document,UCD,PUA,ENTITYDB);