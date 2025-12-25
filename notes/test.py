# Initialize frequency array for all ASCII characters
freqs = [0 for x in range(256)]

# Count character frequencies in the string
for char in "hello my name is sam helloo bellow lllllll":
    freqs[ord(char)] += 1

# Print the frequency array
print(freqs)
