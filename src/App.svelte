<script>
	let me;
	let hpCards = [];
	let options = [
		  'Champions',
		  'Items',
		  'Traits'
	]
	let type = "";
	

	
  
	const loadCards = async (current_selection) => {
	  let string_selector = String(current_selection)
	  try {
  
		const res = await fetch(`/build/${String(current_selection)}.json`);
  

		hpCards = await res.json();
		return displayCards(hpCards);
	  } catch (err) {
		console.error(err);
	  }
	};
  
	const displayCards = (Cards) => {
	  let htmlString = buildHtmlTable(Cards);//JSON.stringify(Cards, undefined, 2);
	  me.innerHTML =  htmlString.innerHTML ;
	};
  
	function onChange(event) {
	  type = loadCards(event.currentTarget.value);
	  
	  }

	// Create a table out of the JSON object



	const buildHtmlTable = (arr) =>  {
		let table = document.createElement('table'),
			columns = addAllColumnHeaders(arr, table);
		for (let i = 0, maxi = arr.length; i < maxi; ++i) {
			let tr = document.createElement('tr');
			for (let j = 0, maxj = columns.length; j < maxj; ++j) {
			let td = document.createElement('td');
			let cellValue = arr[i][columns[j]];
			td.appendChild(document.createTextNode(arr[i][columns[j]] || ''));
			tr.appendChild(td);
			}
			table.appendChild(tr);
		}
		return table;
		
	}

	// Adds a header row to the table and returns the set of columns.
	// Need to do union of keys from all records as some records may not contain
	// all records
	const addAllColumnHeaders = (arr, table) =>  {
		let columnSet = [],
			tr = document.createElement('tr');
		for (let i = 0, l = arr.length; i < l; i++) {
			for (let key in arr[i]) {
			if (arr[i].hasOwnProperty(key) && columnSet.indexOf(key) === -1) {
				columnSet.push(key);
				let th = document.createElement('th');
				th.appendChild(document.createTextNode(key));
				tr.appendChild(th);
			}
			}
		}
		table.appendChild(tr);
		return columnSet;
	}

	
   
  </script>
  
  
  <label>
	  <input checked={type==="Champions"} on:change={onChange} type="radio" name="amount" value="champions" /> Champions
  </label>
  <label>
	  <input checked={type==="Items"} on:change={onChange} type="radio" name="amount" value="items" /> Items
  </label>
  <label>
	  <input checked={type==="Traits"} on:change={onChange} type="radio" name="amount" value="traits" /> Traits
  </label>
  
  
  
  <table bind:this={me}></table>