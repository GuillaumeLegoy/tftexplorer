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
	  console.log(string_selector)
	  try {
  
		const res = await fetch(`/build/${String(current_selection)}.json`);
  
		console.log(type)
		console.log(res)
		hpCards = await res.json();
		return displayCards(hpCards);
	  } catch (err) {
		console.error(err);
	  }
	};
  
	const displayCards = (Cards) => {
	  let htmlString = JSON.stringify(Cards, undefined, 2);
	  
	  me.innerHTML = htmlString ;
	};
  
	function onChange(event) {
	  type = loadCards(event.currentTarget.value);
	  
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
  
  
  
  <pre bind:this={me}></pre>