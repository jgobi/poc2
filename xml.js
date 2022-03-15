import parser from "fast-xml-parser";
import builder from "xmlbuilder";

export function stringifyXML(xmlObject) {
  const [key, value] = Object.entries(xmlObject)[0];
  const xml = builder.create(key, {
    encoding: "UTF-8",
  });

  if (typeof value === "object") _stringifyXML(xml, value);
  else xml.txt(value);

  return xml.end({ pretty: true, indent: "    " });
}

/**
 *
 * @param {import('xmlbuilder').XMLElement} root
 * @param {any} xmlObject
 */
function _stringifyXML(root, xmlObject) {
  for (const [key, value] of Object.entries(xmlObject)) {
    if (key.startsWith("$")) {
      root.att(key.substr(1), value);
    } else if (typeof value !== "object") {
      root.ele(key, null, value);
    } else if (!Array.isArray(value)) {
      const elem = root.ele(key);
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subKey.startsWith("$")) {
          elem.att(subKey.substr(1), subValue);
        } else if (subKey === "#text") {
          elem.txt(subValue);
        } else {
          _stringifyXML(elem, { [subKey]: subValue });
        }
      }
    } else {
      for (const subValue of value) {
        _stringifyXML(root, { [key]: subValue });
      }
    }
  }
  return root;
}

export function parseXML(string) {
  return parser.parse(string, {
    ignoreAttributes: false,
    attributeNamePrefix: "$",
  });
}
