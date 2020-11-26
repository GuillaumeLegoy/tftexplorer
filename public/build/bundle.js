
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.7' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.29.7 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let label0;
    	let input0;
    	let input0_checked_value;
    	let t0;
    	let t1;
    	let label1;
    	let input1;
    	let input1_checked_value;
    	let t2;
    	let t3;
    	let label2;
    	let input2;
    	let input2_checked_value;
    	let t4;
    	let t5;
    	let table;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label0 = element("label");
    			input0 = element("input");
    			t0 = text(" Champions");
    			t1 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t2 = text(" Items");
    			t3 = space();
    			label2 = element("label");
    			input2 = element("input");
    			t4 = text(" Traits");
    			t5 = space();
    			table = element("table");
    			input0.checked = input0_checked_value = /*type*/ ctx[1] === "Champions";
    			attr_dev(input0, "type", "radio");
    			attr_dev(input0, "name", "amount");
    			input0.value = "champions";
    			add_location(input0, file, 84, 3, 1897);
    			add_location(label0, file, 83, 2, 1886);
    			input1.checked = input1_checked_value = /*type*/ ctx[1] === "Items";
    			attr_dev(input1, "type", "radio");
    			attr_dev(input1, "name", "amount");
    			input1.value = "items";
    			add_location(input1, file, 87, 3, 2036);
    			add_location(label1, file, 86, 2, 2025);
    			input2.checked = input2_checked_value = /*type*/ ctx[1] === "Traits";
    			attr_dev(input2, "type", "radio");
    			attr_dev(input2, "name", "amount");
    			input2.value = "traits";
    			add_location(input2, file, 90, 3, 2163);
    			add_location(label2, file, 89, 2, 2152);
    			add_location(table, file, 95, 2, 2291);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label0, anchor);
    			append_dev(label0, input0);
    			append_dev(label0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, label1, anchor);
    			append_dev(label1, input1);
    			append_dev(label1, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, label2, anchor);
    			append_dev(label2, input2);
    			append_dev(label2, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, table, anchor);
    			/*table_binding*/ ctx[3](table);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*onChange*/ ctx[2], false, false, false),
    					listen_dev(input1, "change", /*onChange*/ ctx[2], false, false, false),
    					listen_dev(input2, "change", /*onChange*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*type*/ 2 && input0_checked_value !== (input0_checked_value = /*type*/ ctx[1] === "Champions")) {
    				prop_dev(input0, "checked", input0_checked_value);
    			}

    			if (dirty & /*type*/ 2 && input1_checked_value !== (input1_checked_value = /*type*/ ctx[1] === "Items")) {
    				prop_dev(input1, "checked", input1_checked_value);
    			}

    			if (dirty & /*type*/ 2 && input2_checked_value !== (input2_checked_value = /*type*/ ctx[1] === "Traits")) {
    				prop_dev(input2, "checked", input2_checked_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(label1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(label2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(table);
    			/*table_binding*/ ctx[3](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let me;
    	let hpCards = [];
    	let options = ["Champions", "Items", "Traits"];
    	let type = "";

    	const loadCards = async current_selection => {

    		try {
    			const res = await fetch(`/build/${String(current_selection)}.json`);
    			hpCards = await res.json();
    			return displayCards(hpCards);
    		} catch(err) {
    			console.error(err);
    		}
    	};

    	const displayCards = Cards => {
    		let htmlString = buildHtmlTable(Cards); //JSON.stringify(Cards, undefined, 2);
    		$$invalidate(0, me.innerHTML = htmlString.innerHTML, me);
    	};

    	function onChange(event) {
    		$$invalidate(1, type = loadCards(event.currentTarget.value));
    	}

    	// Create a table out of the JSON object
    	const buildHtmlTable = arr => {
    		let table = document.createElement("table"),
    			columns = addAllColumnHeaders(arr, table);

    		for (let i = 0, maxi = arr.length; i < maxi; ++i) {
    			let tr = document.createElement("tr");

    			for (let j = 0, maxj = columns.length; j < maxj; ++j) {
    				let td = document.createElement("td");
    				let cellValue = arr[i][columns[j]];
    				td.appendChild(document.createTextNode(arr[i][columns[j]] || ""));
    				tr.appendChild(td);
    			}

    			table.appendChild(tr);
    		}

    		return table;
    	};

    	// Adds a header row to the table and returns the set of columns.
    	// Need to do union of keys from all records as some records may not contain
    	// all records
    	const addAllColumnHeaders = (arr, table) => {
    		let columnSet = [], tr = document.createElement("tr");

    		for (let i = 0, l = arr.length; i < l; i++) {
    			for (let key in arr[i]) {
    				if (arr[i].hasOwnProperty(key) && columnSet.indexOf(key) === -1) {
    					columnSet.push(key);
    					let th = document.createElement("th");
    					th.appendChild(document.createTextNode(key));
    					tr.appendChild(th);
    				}
    			}
    		}

    		table.appendChild(tr);
    		return columnSet;
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function table_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			me = $$value;
    			$$invalidate(0, me);
    		});
    	}

    	$$self.$capture_state = () => ({
    		me,
    		hpCards,
    		options,
    		type,
    		loadCards,
    		displayCards,
    		onChange,
    		buildHtmlTable,
    		addAllColumnHeaders
    	});

    	$$self.$inject_state = $$props => {
    		if ("me" in $$props) $$invalidate(0, me = $$props.me);
    		if ("hpCards" in $$props) hpCards = $$props.hpCards;
    		if ("options" in $$props) options = $$props.options;
    		if ("type" in $$props) $$invalidate(1, type = $$props.type);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [me, type, onChange, table_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
