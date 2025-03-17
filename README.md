## Building and testing the project

Pull requests are welcome; please write tests whenever possible. Make sure you have Node.js installed.

- `npm install`
- `npm test` - to run your tests
- `npm start` - to run application in http://localhost:8080. This will watch the `.js` and `.css` files and rebuild on file changes

To run End-to-End tests in headless mode

- add a new environment variable 'TEST_URL' and set it to 'http://localhost:8080/'
- `npm run e2e`

To run End-to-End tests in debug mode

- add a new environment variable 'TEST_URL' and set it to
- Run `TEST_URL=http://localhost:8080/ npm run e2e:open`
- Click on 'Run all specs' in cypress window

## Setting up the data

The current format of the CSV can be found in one of the csv files found in the radars folder (e.g. WNE_2020_2021.csv).

It's a simple format looks similar to the following:

| name   | quadrant       | ring  | icon    | description                    |
|--------|----------------|-------|---------|--------------------------------|
| React  | Frontend       | Adopt | lock    | Although the idea web ...      |
| gRPC   | Infrastructure | Trial | budding | Interservice communication ... |
| Spark  | Data           | Adopt | lock    | Spark is great ...             |
| NodeJS | Backend        | Hold  | lock    | Node ...                       |

You can simply add rows following the same pattern as other rows and the radar will adjust accordingly.

## Building the radar

When the user first comes to the page they will be prompted for which radar they will read. You can populate future radars in the `factory.js` file where the variable `years` is declared. This of course can be made better to be more dynamic but works in the interim.

## Docker Image

See the `Dockerfile` in the repo if you want to build your own container.

## Contribute

The descriptions folder contains a series of markdown files that have descriptions for the items that exist in the CSV file. So, if you add a row in the CSV file for a particular technology you will want to create a `<name_of_tech.md>` file in the `radar/descriptions` directory.
**_This name of this tech from the csv must match the filename exactly_**
**_DO NOT edit descriptions directly in the CSV as that will become difficult to maintain over time_**

If you want to link to another description from inside a markdown file you can simply put an empty href like `[Angular]()`. When that empty reference is clicked the site will navigate to the description for you.
**_The name must match exactly_**

Once you've added your descriptions and items to the csv you can parse the markdown files so that their html is placed into the description column in the csv.

Run `npm run parse_markdown` before you create a PR with new items.

To see the results locally run `npm run start` and that will start a server at `localhost:8080`.

## Customizing Rings

The radar's rings can be customized in several ways:

### Ring Order

Ring order (from center outward) is defined in `src/util/factory.js`. By default, the order is:

```javascript
var ringOrder = ['Invest', 'Hold', 'Trial', 'Divest', 'Fleeing', 'Junkyard']
```

To change the order or add/remove rings:

1. Modify the `ringOrder` array with your preferred ring names
2. Update the `maxRings` variable (line above) to match the number of rings
3. Ensure your CSV file uses these exact ring names in the "ring" column

### Ring Thickness

Ring thickness is controlled by the `sequence` array in `src/util/ringCalculator.js`:

```javascript
var sequence = [0, 6, 5, 3, 2, 1, 1, 1, 1, 1]
```

This array determines the relative spacing between rings:
- The first value (0) represents the center point
- Each subsequent value controls the thickness of a ring
- Larger values create thicker rings
- The sequence should have at least N+1 elements where N is your number of rings

For example, to make outer rings thicker, you could change the sequence to `[0, 6, 5, 3, 3, 3, 3, 3]`.

### Ring Colors

Ring colors are defined in the CSS in `src/stylesheets/base.scss` around line 208:

```scss
path {
  &.ring-arc-0 {
    stroke: none;
    fill: $grey-darkest;  // Innermost ring (Invest)
  }
  &.ring-arc-1 {
    stroke: none;
    fill: $grey-dark;     // Second ring (Hold)
  }
  // And so on...
}
```

The number in `ring-arc-X` corresponds to the ring's index in the `ringOrder` array (0 for innermost, 1 for second, etc.). 

Color variables are defined in `src/stylesheets/_colors.scss`, or you can use hex values directly.

## Futures

- Handle more csv files automatically instead of a static list
- Include all data about the technology (ring, quadrant, etc.) in the markdown files and generate a csv from that rather than double entering data
