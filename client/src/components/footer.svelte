<script lang="ts">
  import {version} from '$app/environment';

  export let app: string;

  const year = new Date().getFullYear();
</script>

<footer class="Grid | Footer" aria-label="information">
  <div class="Footer__main | Stack gap-s ji-center">
    <p>
      <small>
        <span>{app} &copy; {year}</span>
        <a href="https://dbushell.com/" rel="noreferrer" target="_blank">
          <span>David Bushell</span>
        </a>
        <span> • </span>
        <a
          href="https://github.com/dbushell/mesonic2"
          rel="noreferrer"
          target="_blank"
        >
          <span>GitHub</span>
        </a>
      </small>
    </p>
    <p><small> <span>{version}</span></small></p>
  </div>
</footer>
