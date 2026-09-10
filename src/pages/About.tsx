import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl sm:text-4xl">About</h1>

      <div className="mt-6 space-y-8 text-lg">
        <section>
          <h2 className="text-2xl">What this is</h2>
          <p className="mt-2 text-inkSoft">
            Moonshine, the Super Mario Sunshine practice mod, can recolor Mario and FLUDD. Those
            colors live in your settings file as a handful of RGB values. This site is where the
            community shares them.
          </p>
        </section>

        <section>
          <h2 className="text-2xl">How to use a skin</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-inkSoft">
            <li>Find a skin you like and open it.</li>
            <li>
              Either download the file and copy its keys into the <code>[creation]</code> section of
              your <code>susamune.ini</code>, or open the RGB list and type the values into the mod
              menu directly.
            </li>
            <li>Restart the mod menu and the colors are applied.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl">How to share one</h2>
          <p className="mt-2 text-inkSoft">
            Set your colors in the mod menu, close it so the settings file is written, then{' '}
            <Link to="/upload">upload that file</Link>. The site reads only the Mario and FLUDD
            color keys — your ISO paths, key binds and timer layout are dropped in your browser
            before anything is sent.
          </p>
        </section>

        <section>
          <h2 className="text-2xl">Not affiliated with Nintendo</h2>
          <p className="mt-2 text-inkSoft">
            This is a fan project for the speedrunning community. No game assets are distributed
            here — a skin is a list of numbers.
          </p>
        </section>
      </div>
    </div>
  )
}
