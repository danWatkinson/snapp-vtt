Feature: Game master associates events with locations

  As a Game Master
  I Want to associate a Location with an Event
  So That I can model various events in my Campaign

  Background:
    Given there is an admin user

  Scenario: Game master can create an event associated with a location
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with locations tab
    And the admin ensures location "Border Fort" exists
    And the admin navigates to the events tab
    And the admin creates event "Orc Invasion" at location "Border Fort"
    Then event "Orc Invasion" appears in the events list
    And event "Orc Invasion" shows it is at location "Border Fort"

  Scenario: Game master can create an event without a location
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with events tab
    And the admin creates event "Standalone Event" without a location
    Then event "Standalone Event" appears in the events list

  Scenario: Events from parent locations are shown when viewing a location
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with locations tab
    And the admin ensures location "Kingdom of Eldoria" exists
    And the admin creates location "Border Fort With Parent" with parent "Kingdom of Eldoria"
    And the admin navigates to the events tab
    And the admin creates event "Kingdom Defense" at location "Kingdom of Eldoria"
    And the admin creates event "Fort Attack" at location "Border Fort With Parent"
    And the admin navigates to the locations tab
    Then location "Border Fort With Parent" shows event "Fort Attack"
    And location "Border Fort With Parent" shows event "Kingdom Defense" from parent location "Kingdom of Eldoria"
